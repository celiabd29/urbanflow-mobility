"""Signalement d'incidents (FC2) : création et consultation à proximité."""

from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from transport.services.base import haversine_m

from .models import Incident

MAX_COMMENT_LENGTH = 500
DEFAULT_RADIUS_M = 2000
MAX_RADIUS_M = 10000
MAX_RESULTS = 100

# Au-delà, un signalement n'informe plus personne sur l'état actuel de la voirie.
FRESHNESS_DAYS = 7


def _serialise(incident, distance_m=None):
    payload = {
        "id": incident.id,
        "type": incident.type,
        "type_label": incident.get_type_display(),
        "commentaire": incident.commentaire,
        "lat": incident.latitude,
        "lon": incident.longitude,
        "adresse": incident.adresse,
        "date_signalement": incident.date_signalement,
    }
    if distance_m is not None:
        payload["distance_m"] = round(distance_m)
    return payload


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_incident_view(request):
    """
    POST /api/incidents/

    Corps : {"type": "travaux", "lat": .., "lon": .., "commentaire": "", "adresse": ""}
    """
    data = request.data or {}

    incident_type = data.get("type")
    if incident_type not in Incident.Type.values:
        return Response(
            {
                "detail": (
                    f"Type inconnu. Valeurs autorisées : "
                    f"{', '.join(Incident.Type.values)}."
                )
            },
            status=400,
        )

    try:
        latitude = float(data.get("lat"))
        longitude = float(data.get("lon"))
    except (TypeError, ValueError):
        return Response(
            {"detail": "Les coordonnées 'lat' et 'lon' sont obligatoires."}, status=400
        )

    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        return Response({"detail": "Coordonnées hors limites."}, status=400)

    commentaire = (data.get("commentaire") or "").strip()
    if len(commentaire) > MAX_COMMENT_LENGTH:
        return Response(
            {"detail": f"Commentaire limité à {MAX_COMMENT_LENGTH} caractères."},
            status=400,
        )

    incident = Incident.objects.create(
        user=request.user,
        type=incident_type,
        commentaire=commentaire,
        latitude=latitude,
        longitude=longitude,
        adresse=(data.get("adresse") or "").strip()[:255],
    )

    return Response(_serialise(incident), status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_incidents_view(request):
    """
    GET /api/incidents/?lat=&lng=&rayon=

    Signalements récents autour d'un point. Sans coordonnées, renvoie
    simplement les derniers signalements.
    """
    params = request.query_params
    since = timezone.now() - timedelta(days=FRESHNESS_DAYS)
    queryset = Incident.objects.filter(date_signalement__gte=since)

    raw_lat, raw_lng = params.get("lat"), params.get("lng")
    if raw_lat is None or raw_lng is None:
        incidents = [_serialise(item) for item in queryset[:MAX_RESULTS]]
        return Response({"count": len(incidents), "incidents": incidents})

    try:
        latitude, longitude = float(raw_lat), float(raw_lng)
    except (TypeError, ValueError):
        return Response({"detail": "'lat' et 'lng' doivent être des nombres."}, status=400)

    try:
        radius = int(params.get("rayon", DEFAULT_RADIUS_M))
    except (TypeError, ValueError):
        return Response({"detail": "'rayon' doit être un entier (mètres)."}, status=400)

    if not 1 <= radius <= MAX_RADIUS_M:
        return Response(
            {"detail": f"'rayon' doit être compris entre 1 et {MAX_RADIUS_M} mètres."},
            status=400,
        )

    # Le volume de signalements reste modeste : un filtrage en Python évite
    # d'introduire une dépendance géospatiale (PostGIS) pour ce seul besoin.
    nearby = []
    for incident in queryset[:1000]:
        distance = haversine_m(latitude, longitude, incident.latitude, incident.longitude)
        if distance <= radius:
            nearby.append(_serialise(incident, distance))

    nearby.sort(key=lambda item: item["distance_m"])
    return Response({"count": len(nearby), "incidents": nearby[:MAX_RESULTS]})
