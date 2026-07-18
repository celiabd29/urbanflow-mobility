from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class MobilityProfileTests(APITestCase):
    """Profil de mobilité : lecture, mise à jour et contrôle d'accès."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="camille@urbanflow.app",
            password="Str0ng!Pass99",
            first_name="Camille",
        )
        self.url = reverse("users:me")

    def authenticate(self):
        """Authentifie le client via JWT (comme le ferait le frontend)."""
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": "Str0ng!Pass99"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    # --- Contrôle d'accès ---

    def test_me_requires_authentication(self):
        """Sans token, la lecture du profil est refusée."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_requires_authentication(self):
        """Sans token, la mise à jour du profil est refusée."""
        response = self.client.patch(
            self.url,
            {"transport_preferences": {"modes": ["bike"], "frequency": "daily"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Cas nominal ---

    def test_patch_updates_transport_preferences(self):
        """Un PATCH valide enregistre les préférences et les renvoie."""
        self.authenticate()
        payload = {
            "transport_preferences": {
                "modes": ["bike", "rail", "walk"],
                "frequency": "daily",
            }
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["transport_preferences"]["modes"],
            ["bike", "rail", "walk"],
        )
        self.assertEqual(
            response.data["transport_preferences"]["frequency"], "daily"
        )

        # Vérification en base, pas seulement dans la réponse.
        self.user.refresh_from_db()
        self.assertEqual(
            self.user.transport_preferences["modes"], ["bike", "rail", "walk"]
        )
        self.assertEqual(self.user.transport_preferences["frequency"], "daily")

    def test_get_returns_transport_preferences(self):
        """Le GET expose bien le champ."""
        self.authenticate()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("transport_preferences", response.data)

    # --- Validation ---

    def test_patch_rejects_unknown_mode(self):
        """Un mode hors liste blanche est refusé."""
        self.authenticate()
        response = self.client.patch(
            self.url,
            {
                "transport_preferences": {
                    "modes": ["teleportation"],
                    "frequency": "daily",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # La donnée en base ne doit pas avoir bougé.
        self.user.refresh_from_db()
        self.assertEqual(self.user.transport_preferences["modes"], [])

    def test_patch_rejects_empty_modes(self):
        """Une liste de modes vide est refusée."""
        self.authenticate()
        response = self.client.patch(
            self.url,
            {"transport_preferences": {"modes": [], "frequency": "daily"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_rejects_invalid_frequency(self):
        """Une fréquence hors liste blanche est refusée."""
        self.authenticate()
        response = self.client.patch(
            self.url,
            {"transport_preferences": {"modes": ["bus"], "frequency": "parfois"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_rejects_duplicate_modes(self):
        """Les doublons sont refusés."""
        self.authenticate()
        response = self.client.patch(
            self.url,
            {"transport_preferences": {"modes": ["bus", "bus"], "frequency": "weekly"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RegisterTokenTests(APITestCase):
    """L'inscription doit connecter l'utilisateur immédiatement."""

    def test_register_returns_token_pair(self):
        """La réponse d'inscription contient access + refresh, comme le login."""
        response = self.client.post(
            reverse("users:register"),
            {
                "email": "nouveau@urbanflow.app",
                "password": "Str0ng!Pass99",
                "password2": "Str0ng!Pass99",
                "first_name": "Nouveau",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "nouveau@urbanflow.app")

    def test_token_from_register_grants_access_to_me(self):
        """Le token renvoyé permet d'appeler /me/ sans se reconnecter."""
        register = self.client.post(
            reverse("users:register"),
            {
                "email": "direct@urbanflow.app",
                "password": "Str0ng!Pass99",
                "password2": "Str0ng!Pass99",
            },
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {register.data['access']}"
        )

        response = self.client.patch(
            reverse("users:me"),
            {"transport_preferences": {"modes": ["walk"], "frequency": "rare"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
