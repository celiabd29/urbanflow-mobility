from django.contrib import admin

from .models import Trajet


@admin.register(Trajet)
class TrajetAdmin(admin.ModelAdmin):
    """Consultation des trajets enregistrés depuis l'admin."""

    list_display = ("date_trajet", "user", "distance_km", "co2_economise")
    list_filter = ("date_trajet",)
    search_fields = ("user__email", "depart", "arrivee")
    ordering = ("-date_trajet",)
