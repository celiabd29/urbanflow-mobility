"""Tests du calcul d'itinéraire. Les APIs externes sont simulées."""

from copy import deepcopy
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from transport.services.base import TransportAPIError

User = get_user_model()

# Réponse Navitia réduite, calquée sur la structure réelle observée en
# production : marche -> RER A -> marche, avec perturbations liées.
PRIM_JOURNEYS = {
    "journeys": [
        {
            "duration": 1155,
            "nb_transfers": 0,
            "departure_date_time": "20260718T225534",
            "arrival_date_time": "20260718T231449",
            "sections": [
                {
                    "type": "street_network",
                    "mode": "walking",
                    "duration": 240,
                    "from": {"name": "Départ"},
                    "to": {"name": "Gare de Lyon"},
                    "geojson": {
                        "coordinates": [[2.3739, 48.8443], [2.3730, 48.8450]],
                        "properties": [{"length": 51}],
                    },
                },
                {
                    "type": "public_transport",
                    "duration": 840,
                    "from": {"name": "Gare de Lyon (Paris)"},
                    "to": {"name": "La Défense (Puteaux)"},
                    "geojson": {
                        "coordinates": [[2.3730, 48.8450], [2.2377, 48.8918]],
                        "properties": [{"length": 12338}],
                    },
                    "display_informations": {
                        "physical_mode": "RER",
                        "label": "A",
                        "direction": "Saint-Germain-en-Laye",
                        "color": "EB2132",
                        "links": [
                            {"rel": "disruptions", "id": "d-grave"},
                            {"rel": "disruptions", "id": "d-mineure"},
                            {"rel": "terminus", "id": "stop_area:IDFM:64589"},
                        ],
                    },
                },
                {
                    "type": "street_network",
                    "mode": "walking",
                    "duration": 75,
                    "from": {"name": "La Défense"},
                    "to": {"name": "Arrivée"},
                    "geojson": {
                        "coordinates": [[2.2377, 48.8918], [2.2380, 48.8920]],
                        "properties": [{"length": 45}],
                    },
                },
            ],
        }
    ],
    "disruptions": [
        {
            "id": "d-mineure",
            "severity": {"name": "perturbée", "effect": "OTHER_EFFECT", "priority": 30},
            "messages": [{"text": "Panne d'un ascenseur"}],
        },
        {
            "id": "d-grave",
            "severity": {
                "name": "bloquante",
                "effect": "NO_SERVICE",
                "color": "#E4626F",
                "priority": 10,
            },
            "messages": [{"text": "Trafic interrompu"}],
        },
        {
            "id": "d-hors-trajet",
            "severity": {"priority": 5},
            "messages": [{"text": "Autre ligne"}],
        },
    ],
}

# Cas réel observé en production : le RER A cumule 75 pannes d'ascenseur,
# toutes étiquetées 'SIGNIFICANT_DELAYS' et 'active' par IDFM, indiscernables
# d'une vraie perturbation par les champs structurés.
PRIM_MOSTLY_ACCESSIBILITY = {
    "journeys": [
        {
            "duration": 1155,
            "sections": [
                {
                    "type": "public_transport",
                    "duration": 840,
                    "from": {"name": "Gare de Lyon"},
                    "to": {"name": "La Défense"},
                    "geojson": {"coordinates": [[2.37, 48.84], [2.23, 48.89]]},
                    "display_informations": {
                        "physical_mode": "RER",
                        "label": "A",
                        "links": [
                            {"rel": "disruptions", "id": f"asc-{i}"} for i in range(3)
                        ]
                        + [
                            {"rel": "disruptions", "id": "trafic"},
                            {"rel": "disruptions", "id": "vide"},
                        ],
                    },
                }
            ],
        }
    ],
    "disruptions": [
        *[
            {
                "id": f"asc-{i}",
                "severity": {"effect": "SIGNIFICANT_DELAYS", "priority": 30},
                "messages": [{"text": "LA DEFENSE Panne ascenseur situé Rue Carpeaux"}],
            }
            for i in range(3)
        ],
        {
            "id": "trafic",
            "severity": {"effect": "SIGNIFICANT_DELAYS", "priority": 30},
            "messages": [{"text": "Adaptation de l'offre de transport"}],
        },
        {
            "id": "vide",
            "severity": {"priority": 30},
            "messages": [{"text": "   "}],
        },
    ],
}


class TransitRoutingTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="camille@urbanflow.app", password="Str0ng!Pass99"
        )
        self.url = reverse("routing:directions")

    def authenticate(self):
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def post_transit(self):
        return self.client.post(
            self.url,
            {
                "start": [2.3739, 48.8443],
                "end": [2.2377, 48.8918],
                "profile": "transit",
            },
            format="json",
        )

    def test_transit_requires_authentication(self):
        self.assertEqual(
            self.post_transit().status_code, status.HTTP_401_UNAUTHORIZED
        )

    @patch("routing.transit.fetch_json")
    def test_transit_returns_sections(self, mock_fetch):
        """Les étapes doivent être détaillées pour l'affichage façon maquette."""
        mock_fetch.return_value = PRIM_JOURNEYS
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["provider"], "prim")

        journey = response.data["journeys"][0]
        self.assertEqual(journey["duration_s"], 1155)
        types = [section["type"] for section in journey["sections"]]
        self.assertEqual(types, ["walking", "public_transport", "walking"])

        transit_section = journey["sections"][1]
        self.assertEqual(transit_section["mode"], "RER")
        self.assertEqual(transit_section["line"], "A")
        self.assertEqual(transit_section["line_color"], "#EB2132")
        self.assertEqual(transit_section["from"], "Gare de Lyon (Paris)")

    @patch("routing.transit.fetch_json")
    def test_transit_totals_the_section_distances(self, mock_fetch):
        """
        Navitia ne donne pas de distance totale. Sans somme des sections,
        l'écran affichait « — » à côté d'une durée et d'une empreinte carbone
        pourtant calculées sur ces mêmes distances.
        """
        mock_fetch.return_value = PRIM_JOURNEYS
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        # 51 m de marche + 12 338 m de RER + 45 m de marche
        self.assertEqual(response.data["distance_m"], 12434)
        self.assertEqual(response.data["journeys"][0]["distance_m"], 12434)

    @patch("routing.transit.fetch_json")
    def test_transit_distance_ignores_sections_without_length(self, mock_fetch):
        """Les sections d'attente n'ont pas de longueur : elles valent 0."""
        payload = deepcopy(PRIM_JOURNEYS)
        payload["journeys"][0]["sections"].append(
            {"type": "waiting", "duration": 120, "geojson": {}}
        )
        mock_fetch.return_value = payload
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["distance_m"], 12434)

    @patch("routing.transit.fetch_json")
    def test_transit_converts_coordinates_for_leaflet(self, mock_fetch):
        """Navitia renvoie [lon, lat] ; Leaflet attend [lat, lon]."""
        mock_fetch.return_value = PRIM_JOURNEYS
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        first = response.data["journeys"][0]["coordinates"][0]
        self.assertAlmostEqual(first[0], 48.8443)  # latitude d'abord
        self.assertAlmostEqual(first[1], 2.3739)

    @patch("routing.transit.fetch_json")
    def test_transit_attaches_only_route_disruptions(self, mock_fetch):
        """Seules les perturbations liées aux lignes empruntées remontent."""
        mock_fetch.return_value = PRIM_JOURNEYS
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        journey = response.data["journeys"][0]
        identifiers = [item["id"] for item in journey["disruptions"]]
        self.assertIn("d-grave", identifiers)
        # Celle-ci concerne une autre ligne : elle ne doit pas apparaître.
        self.assertNotIn("d-hors-trajet", identifiers)
        # La plus grave (priorité la plus basse) doit être en tête.
        self.assertEqual(identifiers[0], "d-grave")
        # 'd-mineure' est une panne d'ascenseur : rattachée au trajet, mais
        # comptée à part car elle n'affecte pas le trafic.
        self.assertNotIn("d-mineure", identifiers)
        self.assertEqual(journey["accessibility_total"], 1)

    @patch("routing.transit.fetch_json")
    def test_equipment_failures_counted_apart_from_traffic(self, mock_fetch):
        """
        Une panne d'ascenseur ne doit pas gonfler le compteur de perturbations :
        l'utilisateur croirait son trajet dégradé alors qu'il est normal.
        """
        mock_fetch.return_value = PRIM_MOSTLY_ACCESSIBILITY
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        journey = response.data["journeys"][0]
        # 5 signalements liés, dont 3 ascenseurs et 1 message vide.
        self.assertEqual(journey["disruptions_total"], 1)
        self.assertEqual(journey["accessibility_total"], 3)
        self.assertEqual(
            journey["disruptions"][0]["message"], "Adaptation de l'offre de transport"
        )

    @patch("routing.transit.fetch_json")
    def test_empty_messages_are_dropped(self, mock_fetch):
        mock_fetch.return_value = PRIM_MOSTLY_ACCESSIBILITY
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        messages = [
            item["message"] for item in response.data["journeys"][0]["disruptions"]
        ]
        self.assertNotIn("   ", messages)

    @patch("routing.transit.fetch_json")
    def test_transit_flags_disruptions_as_route_specific(self, mock_fetch):
        mock_fetch.return_value = PRIM_JOURNEYS
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        self.assertTrue(response.data["route_disruptions_known"])

    @patch("routing.transit.fetch_json")
    def test_transit_returns_503_when_prim_down(self, mock_fetch):
        mock_fetch.side_effect = TransportAPIError("injoignable", source="IDFM")
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch("routing.transit.fetch_json")
    def test_transit_returns_404_outside_coverage(self, mock_fetch):
        """Hors Île-de-France, PRIM ne propose aucun trajet."""
        mock_fetch.return_value = {"journeys": []}
        self.authenticate()

        with self.settings(VELIB_PRIM_API_KEY="cle-de-test"):
            response = self.post_transit()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Île-de-France", response.data["detail"])

    def test_transit_returns_503_without_api_key(self):
        self.authenticate()
        with self.settings(VELIB_PRIM_API_KEY=""):
            response = self.post_transit()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class OrsRoutingTests(APITestCase):
    """Le comportement ORS existant ne doit pas régresser."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="ors@urbanflow.app", password="Str0ng!Pass99"
        )
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    @patch("routing.services.requests.post")
    def test_ors_route_marked_as_not_disruption_aware(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "features": [
                {
                    "properties": {"summary": {"distance": 1186.0, "duration": 852.0}},
                    "geometry": {"coordinates": [[2.3739, 48.8443], [2.3692, 48.8532]]},
                }
            ]
        }

        with self.settings(ORS_API_KEY="cle-de-test"):
            response = self.client.post(
                reverse("routing:directions"),
                {
                    "start": [2.3739, 48.8443],
                    "end": [2.3692, 48.8532],
                    "profile": "foot-walking",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["provider"], "ors")
        self.assertEqual(response.data["distance_m"], 1186.0)
        # Un itinéraire ORS ne contient pas de ligne : on ne peut rien affirmer.
        self.assertFalse(response.data["route_disruptions_known"])

    def test_transit_listed_in_profiles(self):
        response = self.client.get(reverse("routing:profiles"))
        self.assertIn("transit", response.data["profiles"])
