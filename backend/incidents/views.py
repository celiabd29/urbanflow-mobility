"""Signalement d'incidents (FC2) : création, consultation, suppression et vote.

Routes (préfixe /api/signalements/) :
- GET  ""            liste des signalements actifs (public)
- POST ""            création (authentifié)
- GET  "<pk>/"       détail d'un signalement (public)
- DELETE "<pk>/"     suppression de son propre signalement (authentifié)
- POST "<pk>/voter/" confirmation d'un signalement (authentifié)
"""

from django.db.models import F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from transport.services.base import haversine_m

from .models import Signalement

MAX_COMMENT_LENGTH = 500
DEFAULT_RADIUS_M = 2000
MAX_RADIUS_M = 10000
MAX_RESULTS = 100


def _serialise(signalement, distance_m=None, current_user=None):
    # is_owner : booléen pour le demandeur uniquement, permet au frontend
    # d'afficher « Supprimer » sur ses propres signalements, sans exposer
    # l'identité des auteurs des autres.
    is_owner = bool(
        current_user
        and current_user.is_authenticated
        and signalement.user_id == current_user.id
    )
    payload = {
        "id": signalement.id,
        "type": signalement.type,
        "type_label": signalement.get_type_display(),
        "commentaire": signalement.commentaire,
        "lat": signalement.latitude,
        "lon": signalement.longitude,
        "adresse": signalement.adresse,
        "statut": signalement.statut,
        "votes": signalement.votes,
        "date_creation": signalement.date_creation,
        "is_owner": is_owner,
    }
    if distance_m is not None:
        payload["distance_m"] = round(distance_m)
    return payload


def _create(request):
    """Création d'un signalement (POST)."""
    data = request.data or {}

    incident_type = data.get("type")
    if incident_type not in Signalement.Type.values:
        return Response(
            {
                "detail": (
                    f"Type inconnu. Valeurs autorisées : "
                    f"{', '.join(Signalement.Type.values)}."
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

    signalement = Signalement.objects.create(
        user=request.user,
        type=incident_type,
        commentaire=commentaire,
        latitude=latitude,
        longitude=longitude,
        adresse=(data.get("adresse") or "").strip()[:255],
    )

    return Response(_serialise(signalement, current_user=request.user), status=201)


def _list(request):
    """Liste des signalements actifs (GET), filtrable par proximité."""
    params = request.query_params
    # « Actif » seulement : on n'affiche pas les signalements résolus/expirés,
    # ce qui borne aussi le volume renvoyé.
    queryset = Signalement.objects.filter(statut=Signalement.Statut.ACTIF)

    raw_lat, raw_lng = params.get("lat"), params.get("lng")
    if raw_lat is None or raw_lng is None:
        items = [
            _serialise(item, current_user=request.user)
            for item in queryset[:MAX_RESULTS]
        ]
        return Response({"count": len(items), "incidents": items})

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
    for item in queryset[:1000]:
        distance = haversine_m(latitude, longitude, item.latitude, item.longitude)
        if distance <= radius:
            nearby.append(_serialise(item, distance, current_user=request.user))

    nearby.sort(key=lambda item: item["distance_m"])
    return Response({"count": len(nearby), "incidents": nearby[:MAX_RESULTS]})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def signalements_view(request):
    """
    GET  /api/signalements/  -> liste des signalements actifs (public).
    POST /api/signalements/  -> crée un signalement (authentifié).
    """
    if request.method == "POST":
        return _create(request)
    return _list(request)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticatedOrReadOnly])
def signalement_detail_view(request, pk):
    """
    GET    /api/signalements/<pk>/  -> détail d'un signalement (public).
    DELETE /api/signalements/<pk>/  -> suppression par son propriétaire.
    """
    try:
        signalement = Signalement.objects.get(pk=pk)
    except Signalement.DoesNotExist:
        return Response({"detail": "Signalement introuvable."}, status=404)

    if request.method == "DELETE":
        # Seul le propriétaire peut supprimer son signalement.
        if signalement.user_id is None or signalement.user_id != request.user.id:
            return Response(
                {"detail": "Vous ne pouvez supprimer que vos propres signalements."},
                status=403,
            )
        signalement.delete()
        return Response(status=204)

    return Response(_serialise(signalement, current_user=request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vote_signalement_view(request, pk):
    """
    POST /api/signalements/<pk>/voter/  -> confirme un signalement (+1 vote).

    Incrément atomique via F() (pas de logique anti-doublon : un utilisateur
    peut confirmer plusieurs fois, acceptable pour cette version).
    """
    updated = Signalement.objects.filter(pk=pk).update(votes=F("votes") + 1)
    if not updated:
        return Response({"detail": "Signalement introuvable."}, status=404)

    signalement = Signalement.objects.get(pk=pk)
    return Response({"id": signalement.id, "votes": signalement.votes})
