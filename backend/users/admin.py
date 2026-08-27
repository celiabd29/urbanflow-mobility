from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.utils.translation import gettext_lazy as _

from .models import User


class UserCreationForm(UserCreationForm):
    """Formulaire de création basé sur l'email (pas de username)."""

    class Meta:
        model = User
        fields = ("email",)


class UserChangeForm(UserChangeForm):
    """Formulaire de modification basé sur notre modèle User."""

    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin personnalisé : on réorganise les champs autour de l'email
    puisque le username n'existe plus.
    """

    # On branche nos formulaires personnalisés.
    add_form = UserCreationForm
    form = UserChangeForm
    model = User

    # Colonnes affichées dans la liste des utilisateurs.
    list_display = ("email", "first_name", "last_name", "is_staff", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "first_name", "last_name")
    # Tri par email (le username n'existe plus comme ordre par défaut).
    ordering = ("email",)

    # Disposition des champs sur la page de modification d'un utilisateur.
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name")}),
        (_("Transport"), {"fields": ("transport_preferences",)}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    # Champs affichés sur la page de création d'un utilisateur.
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
    )
