"""Tests du signalement d'incidents (FC2)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from incidents.models import Incident

User = get_user_model()

# Gare de Lyon, et un point à environ 1,2 km (Bastille).
GARE_DE_LYON = (48.8443, 2.3739)
BASTILLE = (48.8532, 2.3692)


class IncidentCreationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        self.url = reverse("incidents:create")

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

    def test_incident_is_saved(self):
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
        incident = Incident.objects.get(pk=response.data["id"])
        self.assertEqual(incident.user, self.user)
        self.assertEqual(incident.type, "travaux")
        self.assertEqual(response.data["type_label"], "Travaux")

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
        self.assertEqual(Incident.objects.count(), 0)

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

        incident = Incident.objects.first()
        self.assertIsNotNone(incident)
        self.assertIsNone(incident.user)


class IncidentListTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        self.url = reverse("incidents:list")
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def make_incident(self, lat, lon, days_ago=0, **kwargs):
        incident = Incident.objects.create(
            user=self.user,
            type=kwargs.pop("type", "travaux"),
            latitude=lat,
            longitude=lon,
            **kwargs,
        )
        if days_ago:
            incident.date_signalement = timezone.now() - timedelta(days=days_ago)
            incident.save()
        return incident

    def test_list_requires_authentication(self):
        self.client.credentials()
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_radius_filters_distant_reports(self):
        self.make_incident(*GARE_DE_LYON)
        self.make_incident(*BASTILLE)  # environ 1,2 km plus loin

        response = self.client.get(
            self.url, {"lat": GARE_DE_LYON[0], "lng": GARE_DE_LYON[1], "rayon": 500}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("distance_m", response.data["incidents"][0])

    def test_wider_radius_includes_both(self):
        self.make_incident(*GARE_DE_LYON)
        self.make_incident(*BASTILLE)

        response = self.client.get(
            self.url, {"lat": GARE_DE_LYON[0], "lng": GARE_DE_LYON[1], "rayon": 3000}
        )
        self.assertEqual(response.data["count"], 2)
        # Le plus proche doit arriver en premier.
        distances = [item["distance_m"] for item in response.data["incidents"]]
        self.assertEqual(distances, sorted(distances))

    def test_stale_reports_are_excluded(self):
        """Un signalement vieux d'un mois ne décrit plus la voirie actuelle."""
        self.make_incident(*GARE_DE_LYON, days_ago=30)
        response = self.client.get(
            self.url, {"lat": GARE_DE_LYON[0], "lng": GARE_DE_LYON[1], "rayon": 3000}
        )
        self.assertEqual(response.data["count"], 0)

    def test_list_without_coordinates_returns_recent_reports(self):
        self.make_incident(*GARE_DE_LYON)
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 1)

    def test_absurd_radius_is_rejected(self):
        response = self.client.get(
            self.url, {"lat": GARE_DE_LYON[0], "lng": GARE_DE_LYON[1], "rayon": 999999}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
