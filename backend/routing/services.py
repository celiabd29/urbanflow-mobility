"""Client HTTP pour l'API OpenRouteService (géocodage + itinéraires)."""

import requests
from django.conf import settings

ORS_BASE = 'https://api.openrouteservice.org'
TIMEOUT = 10  # secondes

# Liste blanche de profils : on refuse toute autre valeur pour ne pas
# relayer n'importe quoi vers l'API externe.
ALLOWED_PROFILES = {
    'foot-walking',     # marche
    'cycling-regular',  # vélo
    'driving-car',      # voiture
    'wheelchair',       # accessibilité (cohérent avec prefer_accessible)
}


class RoutingError(Exception):
    """Erreur métier, transformée en réponse HTTP propre par la vue."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.message = message
        self.status = status


def _headers():
    """En-têtes ORS. La clé vient des settings (donc du .env), jamais du client."""
    key = getattr(settings, 'ORS_API_KEY', '')
    if not key:
        raise RoutingError("Clé ORS_API_KEY absente côté serveur.", status=500)
    return {'Authorization': key, 'Content-Type': 'application/json'}


def geocode(query, limit=5):
    """Convertit une adresse en liste de coordonnées candidates."""
    try:
        response = requests.get(
            f'{ORS_BASE}/geocode/search',
            params={'text': query, 'size': limit, 'boundary.country': 'FR'},
            headers=_headers(),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise RoutingError(f"Service de géocodage injoignable : {exc}")

    if response.status_code != 200:
        raise RoutingError("Le géocodage a échoué.")

    features = response.json().get('features', [])
    # On ne renvoie au front que le strict nécessaire.
    return [
        {
            'label': feature['properties'].get('label'),
            'lat': feature['geometry']['coordinates'][1],
            'lon': feature['geometry']['coordinates'][0],
        }
        for feature in features
    ]


def reverse_geocode(lat, lon):
    """
    Adresse la plus proche d'un point.

    Sert à l'écran de signalement : l'utilisateur place une épingle sur la
    carte, on lui montre une adresse lisible plutôt que des coordonnées.
    """
    try:
        response = requests.get(
            f'{ORS_BASE}/geocode/reverse',
            params={'point.lat': lat, 'point.lon': lon, 'size': 1},
            headers=_headers(),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise RoutingError(f"Service de géocodage injoignable : {exc}")

    if response.status_code != 200:
        raise RoutingError("Le géocodage inverse a échoué.")

    features = response.json().get('features') or []
    if not features:
        return None
    return features[0]['properties'].get('label')


def _extract_steps(segments, coordinates):
    """Aplati les étapes de guidage ORS en une liste exploitable par le front.

    ORS fournit un pas-à-pas complet dans properties.segments[].steps[]. On ne
    recalcule rien : on reprend son instruction (déjà en français, cf. le
    paramètre `language` de la requête), sa distance et son type de manœuvre.

    `way_points[0]` indexe le point de DÉBUT de l'étape dans la géométrie : on
    en récupère les coordonnées [lat, lon] (déjà converties) pour permettre
    l'avance automatique par géolocalisation côté client, sans suivi temps réel.
    """
    steps = []
    total = len(coordinates)
    for segment in segments:
        for step in segment.get('steps') or []:
            way_points = step.get('way_points') or []
            index = way_points[0] if way_points else 0
            point = coordinates[index] if 0 <= index < total else None
            name = step.get('name')
            steps.append({
                'instruction': step.get('instruction'),
                # ORS renvoie '-' pour une voie sans nom : on la neutralise.
                'name': name if name and name != '-' else None,
                'distance_m': step.get('distance'),
                'duration_s': step.get('duration'),
                # Code de manœuvre ORS (0 = à gauche, 1 = à droite, 11 = départ…),
                # traduit en icône côté frontend.
                'type': step.get('type'),
                'point': point,
            })
    return steps


def directions(start, end, profile):
    """
    Calcule un itinéraire entre deux points.
    start/end sont au format [longitude, latitude] (convention ORS/GeoJSON).
    """
    if profile not in ALLOWED_PROFILES:
        raise RoutingError(f"Profil non supporté : {profile}", status=400)

    try:
        response = requests.post(
            f'{ORS_BASE}/v2/directions/{profile}/geojson',
            json={
                'coordinates': [start, end],
                # Demande explicite du guidage pas-à-pas, en français.
                'instructions': True,
                'language': 'fr',
            },
            headers=_headers(),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise RoutingError(f"Service d'itinéraire injoignable : {exc}")

    if response.status_code != 200:
        raise RoutingError("Le calcul d'itinéraire a échoué.")

    feature = next(iter(response.json().get('features', [])), None)
    if not feature:
        raise RoutingError("Aucun itinéraire trouvé.", status=404)

    summary = feature['properties'].get('summary', {})
    # ORS renvoie [lon, lat] mais Leaflet attend [lat, lon] :
    # on convertit ici pour que le frontend n'ait rien à retourner.
    coordinates = [[lat, lon] for lon, lat in feature['geometry']['coordinates']]
    steps = _extract_steps(feature['properties'].get('segments') or [], coordinates)

    return {
        'distance_m': summary.get('distance'),
        'duration_s': summary.get('duration'),
        'coordinates': coordinates,
        'steps': steps,
    }
