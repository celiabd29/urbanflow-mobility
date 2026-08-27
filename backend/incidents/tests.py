"""Tests du signalement d'incidents (FC2)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from incidents.models import Signalement

User = get_user_model()

# Gare de Lyon, et un point à environ 1,2 km (Bastille).
GARE_DE_LYON = (48.8443, 2.3739)
BASTILLE = (48.8532, 2.3692)


class SignalementCreationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        # Création et liste partagent la même URL (POST vs GET).
        self.url = reverse("signalements:list")

    def authenticate(self):
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_creation_requires_authentication(self):
        response = self.client.post(
            self.url,
            {"type": "travaux", "lat": GARE_DE_LYON[0], "lon": GARE_DE_LYON[1]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_signalement_is_saved(self):
        self.authenticate()
        response = self.client.post(
            self.url,
            {
                "type": "travaux",
                "lat": GARE_DE_LYON[0],
                "lon": GARE_DE_LYON[1],
                "commentaire": "Trottoir barré",
                "adresse": "Gare de Lyon, Paris",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        signalement = Signalement.objects.get(pk=response.data["id"])
        self.assertEqual(signalement.user, self.user)
        self.assertEqual(signalement.type, "travaux")
        self.assertEqual(response.data["type_label"], "Travaux")
        self.assertTrue(response.data["is_owner"])

    def test_comment_is_optional(self):
        self.authenticate()
        response = self.client.post(
            self.url,
            {"type": "panne", "lat": GARE_DE_LYON[0], "lon": GARE_DE_LYON[1]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["commentaire"], "")

    def test_unknown_type_is_rejected(self):
        self.authenticate()
        response = self.client.post(
            self.url,
            {"type": "extraterrestres", "lat": GARE_DE_LYON[0], "lon": GARE_DE_LYON[1]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Signalement.objects.count(), 0)

    def test_missing_coordinates_are_rejected(self):
        self.authenticate()
        response = self.client.post(self.url, {"type": "travaux"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_out_of_range_coordinates_are_rejected(self):
        self.authenticate()
        response = self.client.post(
            self.url, {"type": "travaux", "lat": 200, "lon": 2.37}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_overlong_comment_is_rejected(self):
        self.authenticate()
        response = self.client.post(
            self.url,
            {
                "type": "autre",
                "lat": GARE_DE_LYON[0],
                "lon": GARE_DE_LYON[1],
                "commentaire": "x" * 501,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_survives_its_author(self):
        """Supprimer un compte ne doit pas effacer l'information de voirie."""
        self.authenticate()
        self.client.post(
            self.url,
            {"type": "travaux", "lat": GARE_DE_LYON[0], "lon": GARE_DE_LYON[1]},
            format="json",
        )
        self.user.delete()

        signalement = Signalement.objects.first()
        self.assertIsNotNone(signalement)
        self.assertIsNone(signalement.user)


class SignalementListTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        self.url = reverse("signalements:list")
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def make_signalement(self, lat, lon, days_ago=0, **kwargs):
        signalement = Signalement.objects.create(
            user=self.user,
            type=kwargs.pop("type", "travaux"),
            latitude=lat,
            longitude=lon,
            **kwargs,
        )
        if days_ago:
            signalement.date_creation = timezone.now() - timedelta(days=days_ago)
            signalement.save()
        return signalement

    def test_list_is_public(self):
        """La consultation est ouverte (contrairement au POST, protégé)."""
        self.make_signalement(*GARE_DE_LYON)
        self.client.credentials()  # aucun token
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        item = response.data["incidents"][0]
        self.assertEqual(item["statut"], "actif")
        self.assertEqual(item["votes"], 0)

    def test_radius_filters_distant_reports(self):
        self.make_signalement(*GARE_DE_LYON)
        self.make_signalement(*BASTILLE)  # environ 1,2 km plus loin

        response = self.client.get(
            self.url, {"lat": GARE_DE_LYON[0], "lng": GARE_DE_LYON[1], "rayon": 500}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("distance_m", response.data["incidents"][0])

    def test_wider_radius_includes_both(self):
        self.make_signalement(*GARE_DE_LYON)
        self.make_signalement(*BASTILLE)

        response = self.client.get(
            self.url, {"lat": GARE_DE_LYON[0], "lng": GARE_DE_LYON[1], "rayon": 3000}
        )
        self.assertEqual(response.data["count"], 2)
        # Le plus proche doit arriver en premier.
        distances = [item["distance_m"] for item in response.data["incidents"]]
        self.assertEqual(distances, sorted(distances))

    def test_non_active_reports_are_excluded(self):
        """Seuls les signalements actifs sont renvoyés (résolus/expirés exclus)."""
        self.make_signalement(*GARE_DE_LYON)  # actif par défaut
        self.make_signalement(*BASTILLE, statut=Signalement.Statut.RESOLU)
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 1)

    def test_list_without_coordinates_returns_recent_reports(self):
        self.make_signalement(*GARE_DE_LYON)
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 1)

    def test_absurd_radius_is_rejected(self):
        response = self.client.get(
            self.url, {"lat": GARE_DE_LYON[0], "lng": GARE_DE_LYON[1], "rayon": 999999}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SignalementDetailTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@urbanflow.app", password="Str0ng!Pass99"
        )
        self.other = User.objects.create_user(
            email="other@urbanflow.app", password="Str0ng!Pass99"
        )
        self.signalement = Signalement.objects.create(
            user=self.owner,
            type="travaux",
            latitude=GARE_DE_LYON[0],
            longitude=GARE_DE_LYON[1],
        )

    def token(self, user):
        response = self.client.post(
            reverse("users:login"),
            {"email": user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        return response.data["access"]

    def auth_as(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(user)}")

    def detail_url(self, pk=None):
        return reverse("signalements:detail", args=[pk or self.signalement.pk])

    def vote_url(self, pk=None):
        return reverse("signalements:vote", args=[pk or self.signalement.pk])

    # --- Détail (public) ---
    def test_detail_is_public(self):
        response = self.client.get(self.detail_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.signalement.pk)
        self.assertEqual(response.data["type"], "travaux")

    def test_detail_unknown_returns_404(self):
        response = self.client.get(self.detail_url(pk=999999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Suppression (propriétaire) ---
    def test_delete_requires_authentication(self):
        response = self.client.delete(self.detail_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Signalement.objects.filter(pk=self.signalement.pk).exists())

    def test_owner_can_delete(self):
        self.auth_as(self.owner)
        response = self.client.delete(self.detail_url())
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Signalement.objects.filter(pk=self.signalement.pk).exists())

    def test_non_owner_cannot_delete(self):
        self.auth_as(self.other)
        response = self.client.delete(self.detail_url())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Signalement.objects.filter(pk=self.signalement.pk).exists())

    def test_is_owner_flag_reflects_requester(self):
        self.auth_as(self.owner)
        self.assertTrue(self.client.get(self.detail_url()).data["is_owner"])
        self.auth_as(self.other)
        self.assertFalse(self.client.get(self.detail_url()).data["is_owner"])

    # --- Vote ---
    def test_vote_requires_authentication(self):
        response = self.client.post(self.vote_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vote_increments_counter(self):
        self.auth_as(self.other)
        response = self.client.post(self.vote_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["votes"], 1)
        # Deuxième vote : le compteur avance encore (pas d'anti-doublon).
        response = self.client.post(self.vote_url())
        self.assertEqual(response.data["votes"], 2)
        self.signalement.refresh_from_db()
        self.assertEqual(self.signalement.votes, 2)

    def test_vote_unknown_returns_404(self):
        self.auth_as(self.other)
        response = self.client.post(self.vote_url(pk=999999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
