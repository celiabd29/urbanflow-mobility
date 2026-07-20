from django.contrib import admin

from .models import Incident


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    """Consultation des incidents signalés depuis l'admin."""

    # Le modèle n'a pas de champ « statut » : on affiche le type, l'adresse
    # et la date, qui sont les champs réellement présents.
    list_display = ("type", "adresse", "date_signalement", "user")
    list_filter = ("type", "date_signalement")
    search_fields = ("adresse", "commentaire")
    ordering = ("-date_signalement",)
