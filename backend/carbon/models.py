from django.conf import settings
from django.db import models
from django.utils import timezone


class Trajet(models.Model):
    """
    Trajet effectué et son empreinte carbone.

    Les valeurs de CO₂ sont stockées en **grammes** : un trajet urbain pèse
    souvent quelques dizaines de grammes, et arrondir en kilogrammes ferait
    disparaître l'information. L'affichage convertit en kg.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trajets",
    )
    distance_km = models.FloatField("distance parcourue (km)")
    co2_emis = models.FloatField("CO₂ émis (g)")
    co2_economise = models.FloatField("CO₂ économisé vs voiture (g)")
    date_trajet = models.DateTimeField("date du trajet", default=timezone.now)
    # Détail par mode : [{"mode": "rail", "distance_km": 12.3, "co2_g": 49.4}, ...]
    modes_utilises = models.JSONField("modes utilisés", default=list)

    class Meta:
        verbose_name = "trajet"
        verbose_name_plural = "trajets"
        ordering = ["-date_trajet"]
        indexes = [
            # Le résumé mensuel filtre systématiquement par utilisateur et date.
            models.Index(fields=["user", "-date_trajet"]),
        ]

    def __str__(self):
        return f"{self.user} — {self.distance_km} km, {self.co2_economise} g économisés"
