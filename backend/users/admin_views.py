"""API du tableau de bord d'administration (interface sur-mesure, cf. dossier
p.28). Réservée aux comptes staff : gestion des comptes et statistiques.

Toutes les vues exigent `is_staff`. Des garde-fous évitent qu'un admin se
verrouille lui-même (suspension / rétrogradation / suppression de son propre
compte) et protègent les superusers d'une action par un simple staff.
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from carbon.models import Trajet
from carbon.services import EMISSION_FACTORS

User = get_user_model()

# Derniers trajets montrés dans le détail d'un utilisateur.
RECENT_TRIPS = 10


def _user_summary(user):
    """Ligne de liste : identité, statut et statistiques agrégées."""
    prefs = user.transport_preferences or {}
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": user.date_joined,
        "modes": prefs.get("modes") or [],
        "frequency": prefs.get("frequency"),
        # Annotations (voir la vue liste) : None si aucun trajet.
        "trips_count": getattr(user, "_trips", 0) or 0,
        "co2_saved_g": round(getattr(user, "_co2", 0) or 0, 1),
        "distance_km": round(getattr(user, "_dist", 0) or 0, 2),
    }


def _per_mode(trajets):
    """Répartition des kilomètres et du CO₂ par mode, sur des trajets donnés."""
    per_mode = {}
    for trajet in trajets:
        for entry in trajet.modes_utilises or []:
            mode = entry.get("mode")
            if mode not in EMISSION_FACTORS:
                continue
            aggregate = per_mode.setdefault(
                mode, {"mode": mode, "distance_km": 0.0, "co2_g": 0.0}
            )
            aggregate["distance_km"] += entry.get("distance_km") or 0
            aggregate["co2_g"] += entry.get("co2_g") or 0
    return [
        {
            "mode": item["mode"],
            "distance_km": round(item["distance_km"], 2),
            "co2_g": round(item["co2_g"], 1),
        }
        for item in sorted(per_mode.values(), key=lambda x: -x["distance_km"])
    ]


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_users_view(request):
    """GET /api/admin/users/ : liste des comptes avec statistiques agrégées."""
    users = User.objects.annotate(
        _trips=Count("trajets", distinct=True),
        _co2=Sum("trajets__co2_economise"),
        _dist=Sum("trajets__distance_km"),
    ).order_by("-date_joined")

    return Response(
        {
            "count": users.count(),
            "users": [_user_summary(user) for user in users],
        }
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminUser])
def admin_user_detail_view(request, pk):
    """
    GET    /api/admin/users/<pk>/ : détail + habitudes de déplacement.
    PATCH  : { "is_active"?, "is_staff"? } : suspendre/réactiver, passer admin.
    DELETE : suppression du compte.
    """
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable."}, status=404)

    is_self = target.id == request.user.id

    if request.method == "DELETE":
        if is_self:
            return Response(
                {"detail": "Vous ne pouvez pas supprimer votre propre compte."},
                status=400,
            )
        if target.is_superuser and not request.user.is_superuser:
            return Response(
                {"detail": "Seul un superutilisateur peut supprimer un admin."},
                status=403,
            )
        target.delete()
        return Response(status=204)

    if request.method == "PATCH":
        data = request.data or {}

        # Protéger un superuser d'une modification par un simple staff.
        if target.is_superuser and not request.user.is_superuser:
            return Response(
                {"detail": "Seul un superutilisateur peut modifier un admin."},
                status=403,
            )

        if "is_active" in data:
            if is_self and not data["is_active"]:
                return Response(
                    {"detail": "Vous ne pouvez pas suspendre votre propre compte."},
                    status=400,
                )
            target.is_active = bool(data["is_active"])

        if "is_staff" in data:
            if is_self and not data["is_staff"]:
                return Response(
                    {"detail": "Vous ne pouvez pas retirer votre propre accès admin."},
                    status=400,
                )
            target.is_staff = bool(data["is_staff"])

        target.save(update_fields=["is_active", "is_staff"])
        # On renvoie le détail à jour.

    # Détail (GET, ou réponse du PATCH) : profil + habitudes + derniers trajets.
    trajets = list(Trajet.objects.filter(user=target))
    totals = Trajet.objects.filter(user=target).aggregate(
        count=Count("id"),
        co2=Sum("co2_economise"),
        dist=Sum("distance_km"),
    )
    recent = [
        {
            "id": t.id,
            "date_trajet": t.date_trajet,
            "depart": t.depart,
            "arrivee": t.arrivee,
            "distance_km": round(t.distance_km, 2),
            "co2_economise_g": round(t.co2_economise, 1),
            "modes_utilises": t.modes_utilises,
        }
        for t in sorted(trajets, key=lambda x: x.date_trajet, reverse=True)[:RECENT_TRIPS]
    ]

    prefs = target.transport_preferences or {}
    return Response(
        {
            "id": target.id,
            "email": target.email,
            "first_name": target.first_name,
            "last_name": target.last_name,
            "is_active": target.is_active,
            "is_staff": target.is_staff,
            "is_superuser": target.is_superuser,
            "date_joined": target.date_joined,
            "modes": prefs.get("modes") or [],
            "frequency": prefs.get("frequency"),
            "trips_count": totals["count"] or 0,
            "co2_saved_g": round(totals["co2"] or 0, 1),
            "distance_km": round(totals["dist"] or 0, 2),
            "par_mode": _per_mode(trajets),
            "recent_trips": recent,
        }
    )
