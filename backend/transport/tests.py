"""Tests des endpoints de transport. Les APIs externes sont simulées."""

from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from transport.services.base import TransportAPIError

User = get_user_model()
PARIS_TZ = ZoneInfo("Europe/Paris")

VELIB_PAYLOAD = {
    "results": [
        {
            "stationcode": "12109",
            "name": "Gare de Lyon - Chalon",
            "numbikesavailable": 32,
            "mechanical": 23,
            "ebike": 9,
            "numdocksavailable": 13,
            "capacity": 48,
            "is_renting": "OUI",
            "coordonnees_geo": {"lat": 48.8443, "lon": 2.3739},
        }
    ]
}


def _prim_payload(active=True):
    """Construit une réponse PRIM dont la perturbation est active ou passée."""
    now = datetime.now(PARIS_TZ)
    start = now - timedelta(hours=1)
    end = now + timedelta(hours=1) if active else now - timedelta(minutes=30)
    fmt = "%Y%m%dT%H%M%S"
    return {
        "lastUpdatedDate": "20260718T120000",
        "disruptions": [
            {
                "id": "disruption-1",
                "applicationPeriods": [
                    {"begin": start.strftime(fmt), "end": end.strftime(fmt)}
                ],
                "cause": "TRAVAUX",
                "severity": "PERTURBEE",
                "title": "RER A : travaux",
                "message": "<p>Trafic &#233;interrompu</p>",
                "shortMessage": "Trafic interrompu",
            }
        ],
        "lines": [
            {
                "id": "line:IDFM:C01742",
                "name": "RER A",
                "shortName": "A",
                "mode": "RER",
                # Plusieurs objets impactés pointant vers la même perturbation :
                # cas réel observé en production (variantes de parcours).
                "impactedObjects": [
                    {"type": "line", "disruptionIds": ["disruption-1"]},
                    {"type": "line", "disruptionIds": ["disruption-1"]},
                    {"type": "line", "disruptionIds": ["disruption-1"]},
                ],
            }
        ],
    }


class TransportEndpointsTests(APITestCase):
    def setUp(self):
        cache.clear()  # le cache est partagé entre les tests
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        self.user.transport_preferences = {"modes": ["rail"], "frequency": "daily"}
        self.user.save()
        self.availability_url = reverse("transport:availability")
        self.disruptions_url = reverse("transport:disruptions")

    def authenticate(self):
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    # --- Contrôle d'accès ---

    def test_availability_requires_authentication(self):
        response = self.client.get(self.availability_url, {"lat": 48.84, "lng": 2.37})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_disruptions_requires_authentication(self):
        response = self.client.get(self.disruptions_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Disponibilité des vélos ---

    @patch("transport.services.bikeshare.fetch_json")
    def test_availability_returns_normalised_stations(self, mock_fetch):
        mock_fetch.return_value = VELIB_PAYLOAD
        self.authenticate()

        with self.settings(JCDECAUX_API_KEY=""):  # JCDecaux désactivé
            response = self.client.get(
                self.availability_url, {"lat": 48.8443, "lng": 2.3739, "rayon": 500}
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        station = response.data["stations"][0]
        self.assertEqual(station["provider"], "velib")
        self.assertEqual(station["bikes_available"], 32)
        self.assertEqual(station["electric_bikes"], 9)
        self.assertIn("distance_m", station)

    def test_availability_rejects_missing_coordinates(self):
        self.authenticate()
        response = self.client.get(self.availability_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_availability_rejects_out_of_range_radius(self):
        self.authenticate()
        response = self.client.get(
            self.availability_url, {"lat": 48.84, "lng": 2.37, "rayon": 999999}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("transport.services.bikeshare.fetch_json")
    def test_availability_returns_503_when_provider_down(self, mock_fetch):
        mock_fetch.side_effect = TransportAPIError("injoignable", source="Vélib'")
        self.authenticate()

        with self.settings(JCDECAUX_API_KEY=""):
            response = self.client.get(
                self.availability_url, {"lat": 48.84, "lng": 2.37}
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("detail", response.data)

    # --- Perturbations ---

    @patch("transport.services.disruptions.fetch_json")
    def test_disruptions_returns_active_ones(self, mock_fetch):
        mock_fetch.return_value = _prim_payload(active=True)
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.client.get(self.disruptions_url, {"modes": "rail"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        disruption = response.data["disruptions"][0]
        self.assertEqual(disruption["severity"], "PERTURBEE")
        # Le HTML échappé doit être nettoyé.
        self.assertNotIn("<p>", disruption["message"])
        self.assertEqual(disruption["lines"][0]["mode"], "RER")

    @patch("transport.services.disruptions.fetch_json")
    def test_disruptions_excludes_expired_ones(self, mock_fetch):
        mock_fetch.return_value = _prim_payload(active=False)
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.client.get(self.disruptions_url, {"modes": "rail"})

        self.assertEqual(response.data["total"], 0)

    @patch("transport.services.disruptions.fetch_json")
    def test_disruptions_filters_by_mode(self, mock_fetch):
        """Une perturbation RER ne doit pas remonter pour un profil 'bus'."""
        mock_fetch.return_value = _prim_payload(active=True)
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.client.get(self.disruptions_url, {"modes": "bus"})

        self.assertEqual(response.data["total"], 0)

    @patch("transport.services.disruptions.fetch_json")
    def test_disruptions_deduplicate_lines(self, mock_fetch):
        """Une ligne citée par plusieurs objets impactés n'apparaît qu'une fois."""
        mock_fetch.return_value = _prim_payload(active=True)
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.client.get(self.disruptions_url, {"modes": "rail"})

        lines = response.data["disruptions"][0]["lines"]
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["name"], "A")

    @patch("transport.services.disruptions.fetch_json")
    def test_disruptions_empty_for_modes_without_network(self, mock_fetch):
        """
        Vélo et voiture ne correspondent à aucun réseau : on ne doit rien
        renvoyer, surtout pas l'intégralité des perturbations.
        """
        mock_fetch.return_value = _prim_payload(active=True)
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            for mode in ("bike", "car", "walk"):
                response = self.client.get(self.disruptions_url, {"modes": mode})
                self.assertEqual(response.data["total"], 0, f"mode={mode}")

    @patch("transport.services.disruptions.fetch_json")
    def test_disruptions_fall_back_to_user_profile_modes(self, mock_fetch):
        """Sans paramètre, on utilise les modes du profil de mobilité."""
        mock_fetch.return_value = _prim_payload(active=True)
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.client.get(self.disruptions_url)

        self.assertEqual(response.data["modes"], ["rail"])
        self.assertEqual(response.data["total"], 1)

    def test_disruptions_returns_503_without_api_key(self):
        self.authenticate()
        with self.settings(VELIB_PRIM_API_KEY=""):
            response = self.client.get(self.disruptions_url)
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class CacheTests(APITestCase):
    """Le cache doit éviter de solliciter l'API externe à chaque requête."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="cache@urbanflow.app", password="Str0ng!Pass99"
        )
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    @patch("transport.services.base.requests.get")
    def test_second_identical_call_hits_the_cache(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = VELIB_PAYLOAD

        with self.settings(JCDECAUX_API_KEY=""):
            for _ in range(2):
                self.client.get(
                    reverse("transport:availability"),
                    {"lat": 48.8443, "lng": 2.3739, "rayon": 500},
                )

        # Deux requêtes utilisateur, un seul appel réseau.
        self.assertEqual(mock_get.call_count, 1)
