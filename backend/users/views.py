from django.contrib.auth import get_user_model
from rest_framework import generics, permissions

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Inscription d'un nouvel utilisateur.
    Endpoint public (AllowAny) : pas besoin d'être authentifié pour s'inscrire.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    # Accessible à tous : c'est la porte d'entrée de l'application.
    permission_classes = [permissions.AllowAny]


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
