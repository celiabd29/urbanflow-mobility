from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import TRANSPORT_MODES, USAGE_FREQUENCIES

# On récupère le modèle User actif via get_user_model() plutôt que de
# l'importer directement : c'est la bonne pratique quand on a un User custom.
User = get_user_model()


def validate_transport_preferences_payload(value):
    """
    Valide le profil de mobilité.

    Un JSONField accepte n'importe quelle structure : sans cette validation,
    un client peut enregistrer des modes inexistants. On vérifie donc
    explicitement les modes et la fréquence, et on refuse les valeurs vides.
    """
    if not isinstance(value, dict):
        raise serializers.ValidationError(
            "Les préférences doivent être un objet JSON."
        )

    modes = value.get("modes")
    if not isinstance(modes, list) or not modes:
        raise serializers.ValidationError(
            {"modes": "Sélectionnez au moins un mode de transport."}
        )

    unknown = [mode for mode in modes if mode not in TRANSPORT_MODES]
    if unknown:
        raise serializers.ValidationError(
            {
                "modes": (
                    f"Mode(s) non supporté(s) : {', '.join(map(str, unknown))}. "
                    f"Valeurs autorisées : {', '.join(TRANSPORT_MODES)}."
                )
            }
        )

    if len(set(modes)) != len(modes):
        raise serializers.ValidationError(
            {"modes": "La liste des modes contient des doublons."}
        )

    # La fréquence est facultative : le défaut du modèle est None et l'écran
    # Profil ne l'édite pas (on n'y modifie que les modes). On refuse donc
    # seulement une valeur *renseignée mais invalide*, pas son absence, sinon
    # tout utilisateur dont la fréquence n'a jamais été définie serait incapable
    # de modifier ses modes de transport.
    frequency = value.get("frequency")
    if frequency is not None and frequency not in USAGE_FREQUENCIES:
        raise serializers.ValidationError(
            {
                "frequency": (
                    f"Fréquence invalide. Valeurs autorisées : "
                    f"{', '.join(USAGE_FREQUENCIES)}."
                )
            }
        )

    # Accessibilité (mobilité réduite) : quand elle est active, les itinéraires
    # à pied et en transport en commun sont calculés en version adaptée.
    prefer_accessible = value.get("prefer_accessible")
    if prefer_accessible is not None and not isinstance(prefer_accessible, bool):
        raise serializers.ValidationError(
            {"prefer_accessible": "La préférence d'accessibilité doit être un booléen."}
        )

    return value


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer de lecture / profil.
    Expose les données publiques de l'utilisateur (jamais le mot de passe).
    """

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "transport_preferences",
            # Exposés en lecture seule : le frontend s'en sert pour afficher (ou
            # non) l'accès au tableau de bord d'administration.
            "is_staff",
            "is_superuser",
        )
        # Ces champs sont en lecture seule : on ne les modifie pas via ce
        # serializer. is_staff/is_superuser en particulier ne doivent JAMAIS
        # être modifiables par l'utilisateur lui-même (élévation de privilège).
        read_only_fields = ("id", "email", "is_staff", "is_superuser")

    def validate_transport_preferences(self, value):
        return validate_transport_preferences_payload(value)


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer d'inscription.
    Valide le mot de passe et crée l'utilisateur avec un hachage sécurisé.
    """

    # write_only : le mot de passe n'est jamais renvoyé dans les réponses.
    # validate_password applique les validateurs définis dans settings.py.
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    # Confirmation du mot de passe (saisie en double).
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "transport_preferences",
        )
        # transport_preferences reste optionnel à l'inscription (valeur par défaut sinon).
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name": {"required": False},
            "transport_preferences": {"required": False},
        }

    def validate_transport_preferences(self, value):
        # Même validation qu'à la mise à jour du profil, si le champ est fourni.
        return validate_transport_preferences_payload(value)

    def validate(self, attrs):
        # On vérifie que les deux mots de passe correspondent.
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "The two password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        # On retire password2 : il ne sert qu'à la validation, pas à la création.
        validated_data.pop("password2")
        # On extrait le mot de passe pour le passer à create_user (qui le hache).
        password = validated_data.pop("password")
        # create_user (notre manager) gère l'email + le hachage du mot de passe.
        user = User.objects.create_user(password=password, **validated_data)
        return user
