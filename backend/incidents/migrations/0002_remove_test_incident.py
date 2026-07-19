"""Supprime le signalement créé pour vérifier le déploiement.

L'hébergeur n'offrant pas d'accès shell, une migration reste le seul moyen
d'agir sur les données de production. Elle s'exécute au démarrage via le
`migrate` du Procfile.

Le ciblage porte sur le commentaire exact du signalement de vérification :
aucun signalement réel ne peut porter ce libellé, et viser un identifiant
serait plus fragile.
"""

from django.db import migrations

TEST_COMMENT = "Verification production"


def remove_test_incident(apps, schema_editor):
    Incident = apps.get_model("incidents", "Incident")

    queryset = Incident.objects.filter(commentaire=TEST_COMMENT)
    details = [f"{item.type} @ {item.adresse}" for item in queryset]
    queryset.delete()

    print(
        f"Signalements de test supprimés ({len(details)}) : "
        f"{', '.join(details) if details else 'aucun'}",
        flush=True,
    )


def noop(apps, schema_editor):
    """Suppression irréversible : il n'y a rien à restaurer."""


class Migration(migrations.Migration):

    dependencies = [
        ("incidents", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(remove_test_incident, noop),
    ]
