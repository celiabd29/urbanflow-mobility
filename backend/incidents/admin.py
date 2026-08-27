from django.contrib import admin

from .models import Signalement


@admin.register(Signalement)
class SignalementAdmin(admin.ModelAdmin):
    """Consultation des signalements depuis l'admin."""

    list_display = ("type", "statut", "adresse", "date_creation", "votes", "user")
    list_filter = ("type", "statut", "date_creation")
    search_fields = ("adresse", "commentaire")
    ordering = ("-date_creation",)
