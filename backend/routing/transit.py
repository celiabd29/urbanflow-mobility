"""Itinéraires en transport en commun via PRIM (moteur Navitia d'IDFM).

ORS ne calcule que marche, vélo, voiture et fauteuil. PRIM expose le moteur
Navitia d'Île-de-France Mobilités, qui combine marche et transport en commun,
et rattache les perturbations aux lignes réellement empruntées.

Même clé que les perturbations du Sprint 3 : aucune dépendance supplémentaire.
"""

from django.conf import settings

from transport.services.base import TransportAPIError, fetch_json

PRIM_JOURNEYS_URL = (
    "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys"
)

# Nombre de perturbations détaillées renvoyées par section. Une ligne comme le
# RER A en cumule des dizaines (pannes d'ascenseur pour l'essentiel) : on
# expose les plus graves et on donne le total.
MAX_DISRUPTIONS_PER_SECTION = 3
MAX_JOURNEYS = 4


def _to_leaflet(coordinates):
    """GeoJSON [lon, lat] -> [lat, lon] attendu par Leaflet."""
    return [[lat, lon] for lon, lat in coordinates or []]


def _normalise_disruption(raw):
    severity = raw.get("severity") or {}
    messages = raw.get("messages") or []
    return {
        "id": raw.get("id"),
        "message": (messages[0].get("text") if messages else "") or "",
        "severity": severity.get("name"),
        "effect": severity.get("effect"),
        "color": severity.get("color"),
        # Navitia trie du plus grave (petite valeur) au moins grave.
        "priority": severity.get("priority", 999),
    }


def _section_disruption_ids(section):
    """Identifiants des perturbations rattachées à une section."""
    links = (section.get("display_informations") or {}).get("links") or []
    return [link["id"] for link in links if link.get("rel") == "disruptions"]


def _normalise_section(section, disruptions_by_id):
    """Convertit une section Navitia en structure exploitable par le front."""
    section_type = section.get("type")
    display = section.get("display_informations") or {}
    coordinates = _to_leaflet((section.get("geojson") or {}).get("coordinates"))

    common = {
        "duration_s": section.get("duration", 0),
        "from": (section.get("from") or {}).get("name"),
        "to": (section.get("to") or {}).get("name"),
        "coordinates": coordinates,
    }

    if section_type == "public_transport":
        linked = [
            disruptions_by_id[identifier]
            for identifier in _section_disruption_ids(section)
            if identifier in disruptions_by_id
        ]
        linked.sort(key=lambda item: item["priority"])
        return {
            **common,
            "type": "public_transport",
            "mode": display.get("physical_mode"),
            "line": display.get("label") or display.get("code"),
            "direction": display.get("direction"),
            # Couleur officielle de la ligne, pour coller à l'identité visuelle.
            "line_color": f"#{display['color']}" if display.get("color") else None,
            "disruptions": linked[:MAX_DISRUPTIONS_PER_SECTION],
            "disruptions_total": len(linked),
        }

    if section_type in ("street_network", "crow_fly"):
        return {
            **common,
            "type": "walking",
            "mode": section.get("mode", "walking"),
            "distance_m": section.get("geojson", {}).get("properties", [{}])[0].get(
                "length"
            ),
        }

    # transfer, waiting, etc. : on les garde pour afficher les étapes fidèlement.
    return {**common, "type": section_type}


def _normalise_journey(journey, disruptions_by_id):
    sections = [
        _normalise_section(section, disruptions_by_id)
        for section in journey.get("sections") or []
    ]

    # Tracé complet du trajet, toutes sections confondues.
    coordinates = []
    for section in sections:
        coordinates.extend(section["coordinates"])

    # Perturbations du trajet = union de celles de ses sections, dédoublonnées.
    seen = {}
    for section in sections:
        for disruption in section.get("disruptions") or []:
            seen.setdefault(disruption["id"], disruption)
    journey_disruptions = sorted(seen.values(), key=lambda item: item["priority"])

    return {
        "duration_s": journey.get("duration", 0),
        "nb_transfers": journey.get("nb_transfers", 0),
        "departure_time": journey.get("departure_date_time"),
        "arrival_time": journey.get("arrival_date_time"),
        "coordinates": coordinates,
        "sections": sections,
        "disruptions": journey_disruptions,
        "disruptions_total": sum(
            section.get("disruptions_total", 0) for section in sections
        ),
    }


def journeys(start, end):
    """
    Itinéraires marche + transport en commun entre deux points [lon, lat].

    Renvoie plusieurs propositions, chacune détaillée en sections, avec les
    perturbations rattachées aux lignes réellement empruntées.
    """
    api_key = getattr(settings, "VELIB_PRIM_API_KEY", "")
    if not api_key:
        raise TransportAPIError(
            "Clé PRIM absente côté serveur.", source="Île-de-France Mobilités"
        )

    start_param = f"{start[0]};{start[1]}"
    end_param = f"{end[0]};{end[1]}"

    payload = fetch_json(
        PRIM_JOURNEYS_URL,
        params={"from": start_param, "to": end_param},
        headers={"apikey": api_key},
        cache_key=f"prim:journeys:{start_param}:{end_param}",
        source="Île-de-France Mobilités",
    )

    raw_journeys = payload.get("journeys") or []
    if not raw_journeys:
        raise TransportAPIError(
            "Aucun itinéraire en transport en commun trouvé. "
            "Ce service ne couvre que l'Île-de-France.",
            status=404,
            source="Île-de-France Mobilités",
        )

    disruptions_by_id = {
        item["id"]: _normalise_disruption(item)
        for item in payload.get("disruptions") or []
        if item.get("id")
    }

    return [
        _normalise_journey(journey, disruptions_by_id)
        for journey in raw_journeys[:MAX_JOURNEYS]
    ]
