"""Endpoints de transport : les clés d'API restent côté serveur."""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services.base import TransportAPIError
from .services.bikeshare import nearby_stations
from .services.disruptions import current_disruptions
from .services.weather import weather_report

# Bornes de sécurité : évitent qu'un client demande un rayon absurde
# et fasse travailler inutilement les APIs externes.
DEFAULT_RADIUS_M = 500
MAX_RADIUS_M = 5000


def _parse_coordinate(raw, name, minimum, maximum):
    """Valide un paramètre de coordonnée et renvoie (valeur, erreur)."""
    if raw is None:
        return None, f"Le paramètre '{name}' est obligatoire."
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None, f"Le paramètre '{name}' doit être un nombre."
    if not minimum <= value <= maximum:
        return None, f"Le paramètre '{name}' doit être compris entre {minimum} et {maximum}."
    return value, None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def availability_view(request):
    """
    GET /api/transport/disponibilites/?lat=&lng=&rayon=

    Stations de vélos en libre-service proches, avec leur disponibilité.
    """
    params = request.query_params

    lat, error = _parse_coordinate(params.get("lat"), "lat", -90, 90)
    if error:
        return Response({"detail": error}, status=400)

    lng, error = _parse_coordinate(params.get("lng"), "lng", -180, 180)
    if error:
        return Response({"detail": error}, status=400)

    raw_radius = params.get("rayon", DEFAULT_RADIUS_M)
    try:
        radius = int(raw_radius)
    except (TypeError, ValueError):
        return Response(
            {"detail": "Le paramètre 'rayon' doit être un entier (en mètres)."},
            status=400,
        )
    if not 1 <= radius <= MAX_RADIUS_M:
        return Response(
            {
                "detail": (
                    f"Le paramètre 'rayon' doit être compris entre 1 et "
                    f"{MAX_RADIUS_M} mètres."
                )
            },
            status=400,
        )

    try:
        result = nearby_stations(lat, lng, radius)
    except TransportAPIError as exc:
        # API externe indisponible : 503 explicite, jamais une 500 opaque.
        return Response({"detail": exc.message, "source": exc.source}, status=503)

    return Response(
        {
            "count": len(result["stations"]),
            "radius_m": radius,
            "degraded_providers": result["degraded"],
            "stations": result["stations"],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def weather_view(request):
    """
    GET /api/transport/meteo/?lat=&lng=

    Conditions au point demandé, et précipitations attendues dans les
    prochaines heures le cas échéant.
    """
    params = request.query_params

    lat, error = _parse_coordinate(params.get("lat"), "lat", -90, 90)
    if error:
        return Response({"detail": error}, status=400)

    lng, error = _parse_coordinate(params.get("lng"), "lng", -180, 180)
    if error:
        return Response({"detail": error}, status=400)

    try:
        return Response(weather_report(lat, lng))
    except TransportAPIError as exc:
        return Response({"detail": exc.message, "source": exc.source}, status=503)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def disruptions_view(request):
    """
    GET /api/transport/perturbations/?modes=rail,bus

    Perturbations en cours. Sans paramètre 'modes', on retombe sur les modes
    déclarés dans le profil de mobilité de l'utilisateur connecté.
    """
    raw_modes = request.query_params.get("modes")
    if raw_modes:
        modes = [mode for mode in raw_modes.split(",") if mode.strip()]
    else:
        preferences = request.user.transport_preferences or {}
        # Lecture défensive : les comptes créés avant le profil de mobilité
        # n'ont pas forcément la clé 'modes'.
        modes = preferences.get("modes") or []

    try:
        result = current_disruptions(modes=modes)
    except TransportAPIError as exc:
        return Response({"detail": exc.message, "source": exc.source}, status=503)

    return Response({**result, "modes": modes})
