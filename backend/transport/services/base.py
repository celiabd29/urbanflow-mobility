"""Socle commun aux clients d'API de transport : cache, timeouts, erreurs."""

import logging
from math import asin, cos, radians, sin, sqrt

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Durée de vie du cache : assez courte pour rester "temps réel", assez longue
# pour ne pas solliciter les APIs externes à chaque requête utilisateur.
CACHE_TTL = 60  # secondes
TIMEOUT = 10  # secondes


class TransportAPIError(Exception):
    """
    Panne d'une API externe. La vue la transforme en 503 avec un message
    lisible, plutôt que de laisser remonter une 500 opaque.
    """

    def __init__(self, message, source=None):
        super().__init__(message)
        self.message = message
        self.source = source


def fetch_json(url, *, params=None, headers=None, cache_key=None, source=None):
    """
    GET JSON avec cache court et gestion d'erreurs homogène.

    Toute panne réseau, timeout ou réponse non-200 lève TransportAPIError :
    aucun appelant n'a besoin de connaître les détails de `requests`.
    """
    if cache_key:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    try:
        response = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as exc:
        logger.warning("Appel à %s en échec : %s", source or url, exc)
        raise TransportAPIError(
            f"Le service {source or 'externe'} est injoignable.", source=source
        ) from exc

    if response.status_code != 200:
        logger.warning(
            "Réponse %s de %s", response.status_code, source or url
        )
        raise TransportAPIError(
            f"Le service {source or 'externe'} a répondu {response.status_code}.",
            source=source,
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise TransportAPIError(
            f"Réponse illisible du service {source or 'externe'}.", source=source
        ) from exc

    if cache_key:
        cache.set(cache_key, payload, CACHE_TTL)

    return payload


def haversine_m(lat1, lon1, lat2, lon2):
    """Distance en mètres entre deux points (formule de haversine)."""
    earth_radius = 6371000
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    )
    return 2 * earth_radius * asin(sqrt(a))
