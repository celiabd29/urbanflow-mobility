"""Endpoint de diagnostic : quelle base de données tourne réellement ?

Volontairement limité au strict nécessaire — moteur, origine de la
configuration et persistance — pour ne divulguer aucun identifiant.
"""

from django.conf import settings
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def health_view(request):
    engine = settings.DATABASES["default"]["ENGINE"].rsplit(".", 1)[-1]
    is_sqlite = engine == "sqlite3"

    # Quelles variables d'environnement de base sont visibles par le process ?
    # On expose uniquement leur présence, jamais leur contenu.
    import os

    env_seen = {
        name: bool(os.environ.get(name))
        for name in ("DATABASE_URL", "PGDATABASE", "PGHOST", "PGUSER")
    }

    payload = {
        "database_engine": engine,
        "database_source": getattr(settings, "DATABASE_SOURCE", "inconnu"),
        # SQLite sur un conteneur = disque éphémère : données perdues au
        # prochain déploiement.
        "persistent": not is_sqlite,
        "env_variables_present": env_seen,
        "debug": settings.DEBUG,
    }

    if not is_sqlite:
        # Confirme que la connexion fonctionne vraiment, et donne la version
        # du serveur : preuve qu'on parle bien à PostgreSQL.
        with connection.cursor() as cursor:
            cursor.execute("SELECT version()")
            payload["server_version"] = cursor.fetchone()[0][:60]

    return Response(payload)
