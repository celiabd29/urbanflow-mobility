from django.conf import settings
from django.db import models
from django.utils import timezone


class Incident(models.Model):
    """
    Incident signalé par un utilisateur sur la voirie ou le réseau.

    On conserve le signalement même si le compte est supprimé (SET_NULL) :
    l'information reste utile aux autres usagers, et son auteur n'a plus
    d'importance une fois le compte parti.
    """

    class Type(models.TextChoices):
        TRAVAUX = "travaux", "Travaux"
        ACCIDENT = "accident", "Accident"
        PANNE = "panne", "Panne"
        AUTRE = "autre", "Autre"

    class Statut(models.TextChoices):
        ACTIF = "actif", "Actif"
        RESOLU = "resolu", "Résolu"
        EXPIRE = "expire", "Expiré"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    type = models.CharField("type d'incident", max_length=20, choices=Type.choices)
    statut = models.CharField(
        "statut", max_length=20, choices=Statut.choices, default=Statut.ACTIF
    )
    commentaire = models.TextField("commentaire", blank=True, max_length=500)
    latitude = models.FloatField("latitude")
    longitude = models.FloatField("longitude")
    adresse = models.CharField("adresse", max_length=255, blank=True)
    date_signalement = models.DateTimeField("date du signalement", default=timezone.now)

    class Meta:
        verbose_name = "incident"
        verbose_name_plural = "incidents"
        ordering = ["-date_signalement"]
        indexes = [
            # La carte interroge toujours les signalements les plus récents.
            models.Index(fields=["-date_signalement"]),
        ]

    def __str__(self):
        return f"{self.get_type_display()} — {self.adresse or 'sans adresse'}"
