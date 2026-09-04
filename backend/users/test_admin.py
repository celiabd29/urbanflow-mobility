"""Tests de l'API du tableau de bord d'administration."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from carbon.models import Trajet

User = get_user_model()


class AdminApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="boss@urbanflow.app", password="Str0ng!Pass99"
        )
        self.admin.is_staff = True
        self.admin.save(update_fields=["is_staff"])

        self.member = User.objects.create_user(
            email="membre@urbanflow.app", password="Str0ng!Pass99"
        )
        self.list_url = reverse("admin_api:users")

    def token(self, email):
        response = self.client.post(
            reverse("users:login"),
            {"email": email, "password": "Str0ng!Pass99"},
            format="json",
        )
        return response.data["access"]

    def auth(self, email):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(email)}")

    def detail_url(self, user):
        return reverse("admin_api:user-detail", args=[user.id])

    # --- Contrôle d'accès ---
    def test_list_requires_staff(self):
        self.auth("membre@urbanflow.app")
        self.assertEqual(
            self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN
        )

    def test_list_requires_authentication(self):
        self.assertEqual(
            self.client.get(self.list_url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_staff_can_list_users(self):
        self.auth("boss@urbanflow.app")
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [u["email"] for u in response.data["users"]]
        self.assertIn("membre@urbanflow.app", emails)

    # --- Statistiques agrégées ---
    def test_list_aggregates_trip_stats(self):
        Trajet.objects.create(
            user=self.member,
            depart="A",
            arrivee="B",
            distance_km=10,
            co2_emis=0,
            co2_economise=1180,
            modes_utilises=[{"mode": "bike", "distance_km": 10, "co2_g": 0}],
        )
        self.auth("boss@urbanflow.app")
        row = next(
            u
            for u in self.client.get(self.list_url).data["users"]
            if u["email"] == "membre@urbanflow.app"
        )
        self.assertEqual(row["trips_count"], 1)
        self.assertEqual(row["co2_saved_g"], 1180.0)

    def test_detail_includes_modes_and_recent_trips(self):
        Trajet.objects.create(
            user=self.member,
            depart="A",
            arrivee="B",
            distance_km=10,
            co2_emis=0,
            co2_economise=1180,
            modes_utilises=[{"mode": "bike", "distance_km": 10, "co2_g": 0}],
        )
        self.auth("boss@urbanflow.app")
        data = self.client.get(self.detail_url(self.member)).data
        self.assertEqual(data["trips_count"], 1)
        self.assertEqual(len(data["recent_trips"]), 1)
        self.assertEqual(data["par_mode"][0]["mode"], "bike")

    # --- Actions ---
    def test_staff_can_suspend_member(self):
        self.auth("boss@urbanflow.app")
        response = self.client.patch(
            self.detail_url(self.member), {"is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertFalse(self.member.is_active)

    def test_staff_can_promote_member(self):
        self.auth("boss@urbanflow.app")
        self.client.patch(
            self.detail_url(self.member), {"is_staff": True}, format="json"
        )
        self.member.refresh_from_db()
        self.assertTrue(self.member.is_staff)

    def test_staff_can_delete_member(self):
        self.auth("boss@urbanflow.app")
        response = self.client.delete(self.detail_url(self.member))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.member.pk).exists())

    # --- Garde-fous ---
    def test_admin_cannot_suspend_self(self):
        self.auth("boss@urbanflow.app")
        response = self.client.patch(
            self.detail_url(self.admin), {"is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_admin_cannot_delete_self(self):
        self.auth("boss@urbanflow.app")
        response = self.client.delete(self.detail_url(self.admin))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_staff_cannot_modify_superuser(self):
        superuser = User.objects.create_superuser(
            email="root@urbanflow.app", password="Str0ng!Pass99"
        )
        self.auth("boss@urbanflow.app")
        response = self.client.patch(
            self.detail_url(superuser), {"is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
