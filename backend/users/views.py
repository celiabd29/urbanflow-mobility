from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
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


# Message volontairement identique que le compte existe ou non : on ne divulgue
# jamais si une adresse est enregistrée.
_RESET_GENERIC = (
    "Si un compte existe pour cet email, un lien de réinitialisation a été généré."
)


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    """
    POST /api/users/password-reset/request/  — corps : { "email": "..." }

    Génère un token de réinitialisation à durée de vie courte
    (PASSWORD_RESET_TIMEOUT). Sans envoi d'email : le token et l'uid sont
    renvoyés dans la réponse **uniquement si le compte existe**, pour la démo.
    En production, ce lien partirait par email et la réponse serait identique
    dans tous les cas.
    """
    email = ((request.data or {}).get("email") or "").strip()
    if not email:
        return Response({"detail": "L'email est obligatoire."}, status=400)

    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        # Aucune fuite : même message que si le compte existait, sans token.
        return Response({"detail": _RESET_GENERIC})

    # Token à usage unique : lié au hash du mot de passe, il devient invalide
    # dès que celui-ci change (donc après une réinitialisation réussie).
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return Response({"detail": _RESET_GENERIC, "uid": uid, "token": token})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    POST /api/users/password-reset/confirm/
    Corps : { "uid": "...", "token": "...", "password": "..." }
    """
    data = request.data or {}
    uid = data.get("uid") or ""
    token = data.get("token") or ""
    password = data.get("password") or ""

    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    # Token invalide, expiré, ou déjà utilisé (le hash a changé) -> refus.
    if user is None or not default_token_generator.check_token(user, token):
        return Response(
            {"detail": "Lien de réinitialisation invalide ou expiré."}, status=400
        )

    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        return Response({"password": list(exc.messages)}, status=400)

    user.set_password(password)
    user.save(update_fields=["password"])
    return Response(
        {"detail": "Mot de passe réinitialisé. Vous pouvez vous connecter."}
    )
