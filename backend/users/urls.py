from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import MeView, RegisterView

# Namespace de l'app pour éviter les collisions de noms de routes.
app_name = "users"

urlpatterns = [
    # Inscription (public).
    path("register/", RegisterView.as_view(), name="register"),
    # Connexion : renvoie une paire de tokens (access + refresh).
    path("login/", TokenObtainPairView.as_view(), name="login"),
    # Renouvellement de l'access token à partir du refresh token.
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Profil de l'utilisateur connecté (GET / PATCH / PUT).
    path("me/", MeView.as_view(), name="me"),
]
