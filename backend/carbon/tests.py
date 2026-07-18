"""Tests du calculateur d'empreinte carbone (facteurs ADEME)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from carbon.models import Trajet
from carbon.services import CarbonError, compute_footprint

User = get_user_model()


class FootprintComputationTests(APITestCase):
    """Vérifie la formule elle-même, indépendamment des endpoints."""

    def test_transit_journey_matches_manual_calculation(self):
        """
        Cas réel mesuré en production : Gare de Lyon -> La Défense,
        marche 0,225 km + RER 12,338 km + marche 0,044 km.
        """
        result = compute_footprint(
            [
                {"mode": "walk", "distance_km": 0.225},
                {"mode": "rail", "distance_km": 12.338},
                {"mode": "walk", "distance_km": 0.044},
            ]
        )

        # Seul le RER émet : 12,338 km x 4 g/km = 49,352 g
        self.assertAlmostEqual(result["co2_emis_g"], 49.4, places=1)
        self.assertAlmostEqual(result["distance_km"], 12.607, places=3)
        # Même distance en voiture : 12,607 x 118 = 1487,626 g
        self.assertAlmostEqual(result["co2_voiture_equivalent_g"], 1487.6, places=1)
        # Économie calculée sur les valeurs exactes puis arrondie :
        # 1487,626 - 49,352 = 1438,274. Arrondir avant de soustraire donnerait
        # 1438,2, soit 0,1 g d'erreur accumulée.
        self.assertAlmostEqual(result["co2_economise_g"], 1438.3, places=1)

    def test_bike_journey_emits_nothing_and_saves_everything(self):
        result = compute_footprint([{"mode": "bike", "distance_km": 5}])
        self.assertEqual(result["co2_emis_g"], 0)
        # 5 km x 118 g/km
        self.assertAlmostEqual(result["co2_economise_g"], 590.0, places=1)

    def test_car_journey_saves_nothing(self):
        """Un trajet en voiture ne peut rien économiser par rapport à lui-même."""
        result = compute_footprint([{"mode": "car", "distance_km": 10}])
        self.assertAlmostEqual(result["co2_emis_g"], 1180.0, places=1)
        self.assertEqual(result["co2_economise_g"], 0)

    def test_carpool_saves_the_difference(self):
        result = compute_footprint([{"mode": "carpool", "distance_km": 10}])
        # 10 x 48 = 480 émis ; 10 x 118 = 1180 en voiture seule
        self.assertAlmostEqual(result["co2_emis_g"], 480.0, places=1)
        self.assertAlmostEqual(result["co2_economise_g"], 700.0, places=1)

    def test_modes_are_aggregated(self):
        """Deux segments du même mode sont regroupés."""
        result = compute_footprint(
            [
                {"mode": "walk", "distance_km": 0.5},
                {"mode": "bus", "distance_km": 3},
                {"mode": "walk", "distance_km": 0.5},
            ]
        )
        modes = {item["mode"]: item for item in result["modes_utilises"]}
        self.assertAlmostEqual(modes["walk"]["distance_km"], 1.0)
        self.assertAlmostEqual(modes["bus"]["co2_g"], 42.0, places=1)

    def test_unknown_mode_is_rejected(self):
        with self.assertRaises(CarbonError):
            compute_footprint([{"mode": "teleportation", "distance_km": 1}])

    def test_negative_distance_is_rejected(self):
        with self.assertRaises(CarbonError):
            compute_footprint([{"mode": "bike", "distance_km": -5}])

    def test_empty_journey_is_rejected(self):
        with self.assertRaises(CarbonError):
            compute_footprint([])


class TrajetEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        self.create_url = reverse("carbon:create-trajet")
        self.summary_url = reverse("carbon:monthly-summary")

    def authenticate(self, user=None):
        target = user or self.user
        response = self.client.post(
            reverse("users:login"),
            {"email": target.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_creation_requires_authentication(self):
        response = self.client.post(
            self.create_url,
            {"segments": [{"mode": "bike", "distance_km": 3}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_summary_requires_authentication(self):
        self.assertEqual(
            self.client.get(self.summary_url).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_trajet_is_saved_with_its_footprint(self):
        self.authenticate()
        response = self.client.post(
            self.create_url,
            {
                "segments": [
                    {"mode": "walk", "distance_km": 0.3},
                    {"mode": "rail", "distance_km": 12},
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trajet = Trajet.objects.get(pk=response.data["id"])
        self.assertEqual(trajet.user, self.user)
        self.assertAlmostEqual(trajet.co2_emis, 48.0, places=1)
        self.assertEqual(len(trajet.modes_utilises), 2)

    def test_invalid_mode_returns_400(self):
        self.authenticate()
        response = self.client.post(
            self.create_url,
            {"segments": [{"mode": "fusee", "distance_km": 1}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Trajet.objects.count(), 0)

    def test_absurd_distance_returns_400(self):
        self.authenticate()
        response = self.client.post(
            self.create_url,
            {"segments": [{"mode": "bike", "distance_km": 50000}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MonthlySummaryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        self.other = User.objects.create_user(
            email="autre@urbanflow.app", password="Str0ng!Pass99"
        )
        self.url = reverse("carbon:monthly-summary")
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def make_trajet(self, user, days_ago=0, **kwargs):
        defaults = {
            "distance_km": 10,
            "co2_emis": 40,
            "co2_economise": 1140,
            "modes_utilises": [{"mode": "rail", "distance_km": 10, "co2_g": 40}],
        }
        defaults.update(kwargs)
        trajet = Trajet.objects.create(user=user, **defaults)
        if days_ago:
            trajet.date_trajet = timezone.now() - timedelta(days=days_ago)
            trajet.save()
        return trajet

    def test_summary_counts_only_the_current_month(self):
        self.make_trajet(self.user)
        # 45 jours en arrière : hors du mois courant, quel que soit le jour.
        self.make_trajet(self.user, days_ago=45)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["trajets"], 1)
        self.assertAlmostEqual(response.data["co2_economise_g"], 1140.0, places=1)

    def test_summary_ignores_other_users(self):
        self.make_trajet(self.user)
        self.make_trajet(self.other)
        self.make_trajet(self.other)

        response = self.client.get(self.url)
        self.assertEqual(response.data["trajets"], 1)

    def test_eco_kilometres_exclude_the_car(self):
        self.make_trajet(
            self.user,
            distance_km=20,
            modes_utilises=[
                {"mode": "rail", "distance_km": 12, "co2_g": 48},
                {"mode": "car", "distance_km": 8, "co2_g": 944},
            ],
        )
        response = self.client.get(self.url)
        self.assertAlmostEqual(response.data["km_eco_mobiles"], 12.0, places=1)

    def test_evolution_is_null_without_previous_month(self):
        """Sans historique, annoncer une progression n'aurait aucun sens."""
        self.make_trajet(self.user)
        response = self.client.get(self.url)
        self.assertIsNone(response.data["evolution_pct"])

    def test_summary_exposes_reference_factors(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data["facteurs_emission"]["car"], 118)
        self.assertEqual(response.data["facteurs_emission"]["rail"], 4)

    def test_empty_month_returns_zeroes(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data["trajets"], 0)
        self.assertEqual(response.data["co2_economise_g"], 0)
        self.assertEqual(response.data["par_mode"], [])
