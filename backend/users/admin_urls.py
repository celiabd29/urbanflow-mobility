from django.urls import path

from . import admin_views

app_name = "admin_api"

urlpatterns = [
    # Liste des comptes avec statistiques agrégées.
    path("users/", admin_views.admin_users_view, name="users"),
    # Détail d'un compte + actions (suspendre/réactiver, admin, supprimer).
    path("users/<int:pk>/", admin_views.admin_user_detail_view, name="user-detail"),
]
