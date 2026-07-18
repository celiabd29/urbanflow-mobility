"""Endpoints d'empreinte carbone : enregistrement d'un trajet et bilan mensuel."""

from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Trajet
from .services import EMISSION_FACTORS, REFERENCE_MODE, CarbonError, compute_footprint

# Garde-fou : au-delà, il s'agit d'une erreur de saisie plutôt que d'un trajet
# urbain réel.
MAX_DISTANCE_KM = 1000

# Modes considérés comme éco-mobiles : tout sauf la voiture individuelle.
ECO_MODES = {mode for mode in EMISSION_FACTORS if mode != REFERENCE_MODE}


# Nombre de trajets renvoyés par l'historique : suffisant pour l'écran, et
# borné pour ne pas charger des années de données d'un coup.
HISTORY_LIMIT = 50


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_trajets_view(request):
    """
    GET /api/carbon/historique/

    Derniers trajets de l'utilisateur, du plus récent au plus ancien.
    """
    trajets = Trajet.objects.filter(user=request.user)[:HISTORY_LIMIT]

    return Response(
        {
            "count": Trajet.objects.filter(user=request.user).count(),
            "trajets": [
                {
                    "id": trajet.id,
                    "date_trajet": trajet.date_trajet,
                    "distance_km": round(trajet.distance_km, 2),
                    "co2_emis_g": round(trajet.co2_emis, 1),
                    "co2_economise_g": round(trajet.co2_economise, 1),
                    "modes_utilises": trajet.modes_utilises,
                }
                for trajet in trajets
            ],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_trajet_view(request):
    """
    POST /api/carbon/trajets/

    Corps : {"segments": [{"mode": "rail", "distance_km": 12.34}, ...]}
    Calcule l'empreinte du trajet et l'enregistre pour l'utilisateur connecté.
    """
    data = request.data or {}

    try:
        footprint = compute_footprint(data.get("segments"))
    except CarbonError as exc:
        return Response({"detail": str(exc)}, status=400)

    if footprint["distance_km"] > MAX_DISTANCE_KM:
        return Response(
            {"detail": f"Distance totale irréaliste (> {MAX_DISTANCE_KM} km)."},
            status=400,
        )

    trajet = Trajet.objects.create(
        user=request.user,
        distance_km=footprint["distance_km"],
        co2_emis=footprint["co2_emis_g"],
        co2_economise=footprint["co2_economise_g"],
        modes_utilises=footprint["modes_utilises"],
    )

    return Response(
        {"id": trajet.id, "date_trajet": trajet.date_trajet, **footprint}, status=201
    )


def _month_bounds(reference):
    """Début du mois de `reference`, et début du mois suivant."""
    start = reference.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        next_start = start.replace(year=start.year + 1, month=1)
    else:
        next_start = start.replace(month=start.month + 1)
    return start, next_start


def _aggregate(trajets):
    """Totaux et détail par mode sur un ensemble de trajets."""
    totals = trajets.aggregate(
        count=Count("id"),
        distance=Sum("distance_km"),
        emis=Sum("co2_emis"),
        economise=Sum("co2_economise"),
    )

    # Le détail par mode vit dans un JSONField : on l'agrège en Python plutôt
    # que d'imposer une requête SQL spécifique à PostgreSQL.
    per_mode = {}
    eco_km = 0.0
    for trajet in trajets.only("modes_utilises"):
        for entry in trajet.modes_utilises or []:
            mode = entry.get("mode")
            if mode not in EMISSION_FACTORS:
                continue
            aggregate = per_mode.setdefault(
                mode, {"mode": mode, "distance_km": 0.0, "co2_g": 0.0}
            )
            aggregate["distance_km"] += entry.get("distance_km") or 0
            aggregate["co2_g"] += entry.get("co2_g") or 0
            if mode in ECO_MODES:
                eco_km += entry.get("distance_km") or 0

    return {
        "trajets": totals["count"] or 0,
        "distance_km": round(totals["distance"] or 0, 2),
        "co2_emis_g": round(totals["emis"] or 0, 1),
        "co2_economise_g": round(totals["economise"] or 0, 1),
        "km_eco_mobiles": round(eco_km, 2),
        "par_mode": [
            {
                "mode": item["mode"],
                "distance_km": round(item["distance_km"], 2),
                "co2_g": round(item["co2_g"], 1),
            }
            for item in sorted(per_mode.values(), key=lambda x: -x["distance_km"])
        ],
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def monthly_summary_view(request):
    """
    GET /api/carbon/resume/

    Bilan du mois en cours, avec l'évolution par rapport au mois précédent.
    """
    now = timezone.localtime()
    start, next_start = _month_bounds(now)
    previous_start, _ = _month_bounds(start - timedelta(days=1))

    trajets = Trajet.objects.filter(user=request.user)
    current = _aggregate(
        trajets.filter(date_trajet__gte=start, date_trajet__lt=next_start)
    )
    previous = _aggregate(
        trajets.filter(date_trajet__gte=previous_start, date_trajet__lt=start)
    )

    # Évolution du CO₂ économisé. Sans mois précédent, la comparaison n'a pas
    # de sens : on renvoie None plutôt qu'un trompeur +100 %.
    previous_saved = previous["co2_economise_g"]
    if previous_saved > 0:
        evolution = round(
            (current["co2_economise_g"] - previous_saved) / previous_saved * 100
        )
    else:
        evolution = None

    return Response(
        {
            "mois": start.strftime("%Y-%m"),
            **current,
            "evolution_pct": evolution,
            "mois_precedent": {
                "co2_economise_g": previous["co2_economise_g"],
                "trajets": previous["trajets"],
            },
            # Facteurs de référence, pour le graphique de comparaison : le
            # frontend n'a pas à les dupliquer.
            "facteurs_emission": EMISSION_FACTORS,
        }
    )
