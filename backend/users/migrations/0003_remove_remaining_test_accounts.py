"""Nettoyage final avant soutenance : supprime les comptes de vérification.

La migration 0002 avait déjà fait le ménage, mais les vérifications de
déploiement suivantes (Sprint 3, transit, persistance) ont recréé des comptes.
Une migration ne s'exécutant qu'une fois, il en faut une nouvelle.

On cible cette fois tout le domaine @urbanflow.app, réservé aux tests, plutôt
qu'une liste nominative : cela couvre aussi les comptes éventuellement oubliés.
Le compte de démonstration du jury est sur urbanflow.fr et n'est donc pas
concerné — une garde explicite le protège en plus.
"""

import os

from django.db import migrations

# Domaine d'exemple, utilisé uniquement par les comptes de vérification.
TEST_DOMAIN = "@urbanflow.app"


def remove_test_accounts(apps, schema_editor):
    User = apps.get_model("users", "User")

    queryset = User.objects.filter(email__iendswith=TEST_DOMAIN)

    # Ceinture et bretelles : si le compte de démonstration devait un jour
    # utiliser ce domaine, il ne doit jamais être supprimé.
    demo_email = (os.environ.get("DEMO_ACCOUNT_EMAIL") or "").strip().lower()
    if demo_email:
        queryset = queryset.exclude(email__iexact=demo_email)

    emails = list(queryset.values_list("email", flat=True))
    queryset.delete()

    print(
        f"Comptes de vérification supprimés ({len(emails)}) : "
        f"{', '.join(emails) if emails else 'aucun'}",
        flush=True,
    )


def noop(apps, schema_editor):
    """Suppression irréversible : il n'y a rien à restaurer."""


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_remove_test_accounts"),
    ]

    operations = [
        migrations.RunPython(remove_test_accounts, noop),
    ]
