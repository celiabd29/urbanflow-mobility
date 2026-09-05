from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class LoginView(TokenObtainPairView):
    """
    Connexion (paire de tokens JWT), protégée contre le brute-force.

    Le throttle « login » (5 tentatives/min/IP, cf. DEFAULT_THROTTLE_RATES)
    répond en 429 au-delà, ce qui ralentit fortement une attaque par
    dictionnaire sans gêner un usage normal.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterView(generics.CreateAPIView):
    """
    Inscription d'un nouvel utilisateur.
    Endpoint public (AllowAny) : pas besoin d'être authentifié pour s'inscrire.

    La réponse contient une paire de tokens JWT en plus du profil : l'utilisateur
    est donc connecté d'emblée et peut enchaîner sur la configuration de son
    profil de mobilité sans se reconnecter manuellement.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    # Accessible à tous : c'est la porte d'entrée de l'application.
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Même paire de tokens que celle renvoyée par l'endpoint de login.
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """
    Profil de l'utilisateur connecté.
    - GET  : consulter son profil.
    - PATCH/PUT : mettre à jour ses infos (dont transport_preferences).
    Protégé : nécessite un token JWT valide.
    """

    serializer_class = UserSerializer
    # Seul un utilisateur authentifié accède à son propre profil.
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # On renvoie toujours l'utilisateur lié au token, jamais un autre.
        return self.request.user
