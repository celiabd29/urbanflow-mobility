from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """
    Manager personnalisé : on se base sur l'email (et non le username)
    comme identifiant unique pour créer les utilisateurs et superusers.
    """

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        # L'email est obligatoire : on lève une erreur s'il est absent.
        if not email:
            raise ValueError(_("The email address must be set"))
        # On normalise l'email (met le domaine en minuscules, etc.).
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        # set_password gère le hachage sécurisé du mot de passe.
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        # Utilisateur standard : ni staff, ni superuser par défaut.
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        # Superuser : on force les droits admin.
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self._create_user(email, password, **extra_fields)


def default_transport_preferences():
    """
    Valeur par défaut du champ JSON des préférences de transport.
    On utilise une fonction (et non un dict littéral) pour éviter le piège
    du mutable partagé entre toutes les instances.
    """
    return {
        "modes": [],            # ex. ["bus", "metro", "bike"]
        "avoid": [],            # ex. ["highway", "stairs"]
        "max_walk_minutes": 15,
        "prefer_accessible": False,
    }


class User(AbstractUser):
    """
    Modèle utilisateur personnalisé pour UrbanFlow Mobility.
    - L'email remplace le username comme identifiant de connexion.
    - Un champ JSON stocke les préférences de transport de l'utilisateur.
    """

    # On supprime le username : l'email devient l'identifiant unique.
    username = None
    email = models.EmailField(_("email address"), unique=True)

    # Préférences de mobilité stockées en JSON (souple, sans nouvelle table).
    transport_preferences = models.JSONField(
        _("transport preferences"),
        default=default_transport_preferences,
        blank=True,
    )

    # Django doit utiliser l'email pour l'authentification.
    USERNAME_FIELD = "email"
    # Plus besoin de lister "email" ici puisqu'il est déjà USERNAME_FIELD.
    REQUIRED_FIELDS = []

    # On branche notre manager personnalisé.
    objects = UserManager()

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self):
        return self.email
