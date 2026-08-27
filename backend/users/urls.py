from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, MeView, RegisterView

# Namespace de l'app pour éviter les collisions de noms de routes.
app_name = "users"

urlpatterns = [
    # Inscription (public).
    path("register/", RegisterView.as_view(), name="register"),
    # Connexion : renvoie une paire de tokens (access + refresh).
    # Vue dédiée = throttle anti brute-force (5/min/IP).
    path("login/", LoginView.as_view(), name="login"),
    # Renouvellement de l'access token à partir du refresh token.
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Profil de l'utilisateur connecté (GET / PATCH / PUT).
    path("me/", MeView.as_view(), name="me"),
]
