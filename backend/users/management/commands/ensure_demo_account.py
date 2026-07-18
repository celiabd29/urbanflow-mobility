"""Crée (ou remet en conformité) le compte de démonstration documenté.

Le dossier technique communique un identifiant au jury : ce compte doit donc
exister en production sans que personne ait à s'inscrire.

Les identifiants viennent de variables d'environnement, jamais du code : le
dépôt est public, et y écrire un mot de passe de production reviendrait à le
publier. La commande est idempotente et s'exécute à chaque démarrage (voir le
Procfile), ce qui permet de définir les variables après un premier déploiement.
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

# Profil de mobilité par défaut, pour que les fonctionnalités qui en dépendent
# (perturbations par mode) soient démontrables dès la première connexion.
DEFAULT_PREFERENCES = {
    "modes": ["bike", "rail"],
    "frequency": "daily",
    "avoid": [],
    "max_walk_minutes": 15,
    "prefer_accessible": False,
}


class Command(BaseCommand):
    help = "Crée ou met à jour le compte de démonstration à partir de l'environnement."

    def handle(self, *args, **options):
        email = (os.environ.get("DEMO_ACCOUNT_EMAIL") or "").strip().lower()
        password = os.environ.get("DEMO_ACCOUNT_PASSWORD") or ""

        if not email or not password:
            # Absence de configuration : cas normal en local, on ne fait rien.
            self.stdout.write(
                "Compte de démonstration non configuré "
                "(DEMO_ACCOUNT_EMAIL / DEMO_ACCOUNT_PASSWORD absents) : ignoré."
            )
            return

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={"first_name": "Jury", "transport_preferences": DEFAULT_PREFERENCES},
        )

        # On réaligne systématiquement le mot de passe sur la valeur documentée :
        # le jury doit pouvoir se connecter avec ce qui est écrit dans le dossier.
        user.set_password(password)
        user.is_active = True

        if not (user.transport_preferences or {}).get("modes"):
            user.transport_preferences = DEFAULT_PREFERENCES

        user.save()

        # Le mot de passe n'est évidemment jamais journalisé.
        self.stdout.write(
            self.style.SUCCESS(
                f"Compte de démonstration {'créé' if created else 'mis à jour'} : {email}"
            )
        )
