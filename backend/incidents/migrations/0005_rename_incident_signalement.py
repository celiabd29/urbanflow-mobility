"""Renomme le modèle Incident -> Signalement et le champ date_signalement ->
date_creation, pour aligner le code sur le dossier technique.

Écrite à la main (RenameModel / RenameField) afin de préserver les données
existantes : un delete+create généré automatiquement les aurait perdues.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("incidents", "0004_incident_votes"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Incident",
            new_name="Signalement",
        ),
        migrations.RenameField(
            model_name="signalement",
            old_name="date_signalement",
            new_name="date_creation",
        ),
    ]
