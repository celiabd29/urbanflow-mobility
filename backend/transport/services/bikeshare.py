"""Disponibilité des vélos en libre-service (Vélib' Paris + JCDecaux)."""

from django.conf import settings

from .base import TransportAPIError, fetch_json, haversine_m

# Vélib' Métropole est exploité par Smovengo (et non JCDecaux depuis 2018).
# Le portail Open Data de Paris expose la disponibilité temps réel sans clé,
# avec un filtrage par rayon natif.
VELIB_URL = (
    "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/"
    "velib-disponibilite-en-temps-reel/records"
)
VELIB_MAX_RESULTS = 100

# JCDecaux ne couvre pas Paris : il sert les autres villes (Lyon, Nantes,
# Bruxelles...). Conservé pour rendre l'app utilisable hors Île-de-France.
JCDECAUX_URL = "https://api.jcdecaux.com/vls/v3/stations"


def _velib_stations(lat, lng, radius_m):
    """Stations Vélib' dans le rayon demandé."""
    payload = fetch_json(
        VELIB_URL,
        params={
            # Filtre géographique effectué côté serveur Opendatasoft.
            "where": f"distance(coordonnees_geo, geom'POINT({lng} {lat})', {radius_m}m)",
            "limit": VELIB_MAX_RESULTS,
            "select": (
                "stationcode,name,numbikesavailable,mechanical,ebike,"
                "numdocksavailable,capacity,is_renting,coordonnees_geo"
            ),
        },
        cache_key=f"velib:{lat:.4f}:{lng:.4f}:{radius_m}",
        source="Vélib' (Open Data Paris)",
    )

    stations = []
    for record in payload.get("results", []):
        geo = record.get("coordonnees_geo") or {}
        if geo.get("lat") is None or geo.get("lon") is None:
            continue
        stations.append(
            {
                "provider": "velib",
                "station_id": record.get("stationcode"),
                "name": record.get("name"),
                "lat": geo["lat"],
                "lon": geo["lon"],
                "bikes_available": record.get("numbikesavailable") or 0,
                "mechanical_bikes": record.get("mechanical") or 0,
                "electric_bikes": record.get("ebike") or 0,
                "docks_available": record.get("numdocksavailable") or 0,
                "capacity": record.get("capacity") or 0,
                "is_renting": record.get("is_renting") == "OUI",
                "distance_m": round(
                    haversine_m(lat, lng, geo["lat"], geo["lon"])
                ),
            }
        )
    return stations


def _jcdecaux_stations(lat, lng, radius_m):
    """
    Stations JCDecaux dans le rayon demandé.

    L'API ne propose pas de filtre géographique : on récupère l'ensemble des
    stations (mis en cache) puis on filtre localement. Sans clé configurée,
    on renvoie simplement une liste vide plutôt que de faire échouer la requête.
    """
    api_key = getattr(settings, "JCDECAUX_API_KEY", "")
    if not api_key:
        return []

    payload = fetch_json(
        JCDECAUX_URL,
        params={"apiKey": api_key},
        cache_key="jcdecaux:all",
        source="JCDecaux",
    )

    stations = []
    for record in payload:
        position = record.get("position") or {}
        lat2, lon2 = position.get("latitude"), position.get("longitude")
        if lat2 is None or lon2 is None:
            continue

        distance = haversine_m(lat, lng, lat2, lon2)
        if distance > radius_m:
            continue

        totals = record.get("totalStands") or {}
        availabilities = totals.get("availabilities") or {}
        stations.append(
            {
                "provider": "jcdecaux",
                "station_id": str(record.get("number")),
                "name": record.get("name"),
                "lat": lat2,
                "lon": lon2,
                "bikes_available": availabilities.get("bikes") or 0,
                "mechanical_bikes": availabilities.get("mechanicalBikes") or 0,
                "electric_bikes": availabilities.get("electricalBikes") or 0,
                "docks_available": availabilities.get("stands") or 0,
                "capacity": totals.get("capacity") or 0,
                "is_renting": record.get("status") == "OPEN",
                "distance_m": round(distance),
                "contract": record.get("contractName"),
            }
        )
    return stations


def nearby_stations(lat, lng, radius_m):
    """
    Stations de vélos en libre-service autour d'un point, tous fournisseurs.

    Si un fournisseur tombe en panne mais que l'autre répond, on renvoie ce
    qu'on a : mieux vaut une liste partielle qu'une erreur totale. On ne lève
    TransportAPIError que si aucun fournisseur n'a répondu.
    """
    stations = []
    failures = []

    for name, fetcher in (
        ("Vélib'", _velib_stations),
        ("JCDecaux", _jcdecaux_stations),
    ):
        try:
            stations.extend(fetcher(lat, lng, radius_m))
        except TransportAPIError as exc:
            failures.append((name, exc))

    if failures and not stations:
        # Tous les fournisseurs interrogés ont échoué.
        raise failures[0][1]

    stations.sort(key=lambda station: station["distance_m"])
    return {
        "stations": stations,
        "degraded": [name for name, _ in failures],
    }
