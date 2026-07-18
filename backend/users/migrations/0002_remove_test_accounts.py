"""Supprime les comptes créés pendant les vérifications de déploiement.

Passer par une migration est ici le seul moyen d'agir sur la base de
production : l'hébergeur ne donne pas d'accès shell, il n'existe pas de
superuser en production et aucun endpoint ne permet la suppression.
La migration s'exécute au démarrage, via le `migrate` du Procfile.
"""

from django.db import migrations

# Liste explicite : on ne supprime que des comptes précisément identifiés.
# Le domaine @urbanflow.app est un domaine d'exemple, jamais utilisé par de
# vrais comptes (ceux-ci utilisent de vraies adresses).
TEST_EMAILS = [
    "diag-db@urbanflow.app",
    "verif-deploiement@urbanflow.app",
    "verif-sprint3@urbanflow.app",
    "camille.test@urbanflow.app",
]

# Préfixe des comptes créés en boucle par la sonde de déploiement
# (sonde1@…, sonde2@…), dont le nombre exact n'est pas connu à l'avance.
PROBE_PREFIX = "sonde"
TEST_DOMAIN = "@urbanflow.app"


def remove_test_accounts(apps, schema_editor):
    User = apps.get_model("users", "User")

    deleted, _ = User.objects.filter(email__in=TEST_EMAILS).delete()
    probes, _ = User.objects.filter(
        email__startswith=PROBE_PREFIX, email__endswith=TEST_DOMAIN
    ).delete()

    print(
        f"Comptes de test supprimés : {deleted} nommés, {probes} sondes.",
        flush=True,
    )


def noop(apps, schema_editor):
    """Suppression irréversible : il n'y a rien à restaurer."""


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(remove_test_accounts, noop),
    ]
