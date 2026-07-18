"""Perturbations des transports en commun (Île-de-France Mobilités / PRIM)."""

import html
import re
from datetime import datetime
from zoneinfo import ZoneInfo

from django.conf import settings

from .base import TransportAPIError, fetch_json

PRIM_URL = (
    "https://prim.iledefrance-mobilites.fr/marketplace/"
    "disruptions_bulk/disruptions/v2"
)

# Les horodatages PRIM sont exprimés en heure locale française, sans fuseau.
PARIS_TZ = ZoneInfo("Europe/Paris")
PRIM_DATETIME_FORMAT = "%Y%m%dT%H%M%S"

# Correspondance entre les modes du profil de mobilité (users.models)
# et les modes exposés par PRIM. Vélo, voiture et marche n'ont pas de
# perturbations de réseau : ils sont volontairement absents.
MODE_MAPPING = {
    "bus": {"bus", "noctilien"},
    "rail": {"metro", "rer", "tram", "train", "transilien", "ter", "funicular"},
}

_TAG_RE = re.compile(r"<[^>]+>")


def _clean_message(raw):
    """Transforme le HTML échappé de PRIM en texte lisible."""
    if not raw:
        return ""
    text = html.unescape(raw)
    text = _TAG_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_datetime(value):
    """'20260803T223000' -> datetime aware, ou None si illisible."""
    if not value:
        return None
    try:
        return datetime.strptime(value, PRIM_DATETIME_FORMAT).replace(tzinfo=PARIS_TZ)
    except ValueError:
        return None


def _is_active(disruption, now):
    """Vrai si l'une des périodes d'application couvre l'instant présent."""
    periods = disruption.get("applicationPeriods") or []
    for period in periods:
        begin = _parse_datetime(period.get("begin"))
        end = _parse_datetime(period.get("end"))
        if begin and end and begin <= now <= end:
            return True
    return False


def _index_lines_by_disruption(lines):
    """
    Construit l'index inverse perturbation -> lignes concernées.

    PRIM fournit la relation dans l'autre sens (chaque ligne liste les
    identifiants de perturbations qui l'affectent).
    """
    index = {}
    for line in lines:
        line_id = line.get("id")
        summary = {
            "line_id": line_id,
            "name": line.get("shortName") or line.get("name"),
            "mode": line.get("mode"),
        }
        for impacted in line.get("impactedObjects") or []:
            for disruption_id in impacted.get("disruptionIds") or []:
                # Une ligne peut avoir plusieurs objets impactés (variantes de
                # parcours) pointant vers la même perturbation : on dédoublonne
                # sur l'identifiant de ligne pour ne pas l'afficher N fois.
                per_disruption = index.setdefault(disruption_id, {})
                per_disruption.setdefault(line_id, summary)
    return {
        disruption_id: list(lines_by_id.values())
        for disruption_id, lines_by_id in index.items()
    }


def _wanted_prim_modes(modes):
    """
    Convertit les modes du profil utilisateur en modes PRIM.

    Renvoie None seulement si aucun mode n'est demandé (= pas de filtre).
    Un ensemble vide est une réponse légitime : un profil « vélo » ou
    « voiture » ne correspond à aucun réseau de transport en commun, et doit
    donc ne remonter aucune perturbation — surtout pas toutes.
    """
    if not modes:
        return None  # aucun filtre : on renvoie tous les modes
    wanted = set()
    for mode in modes:
        wanted |= MODE_MAPPING.get(mode.strip().lower(), set())
    return wanted


def current_disruptions(modes=None, limit=50):
    """
    Perturbations en cours, éventuellement filtrées par mode de transport.

    Le filtrage par mode remplace un filtrage géographique : les perturbations
    PRIM sont indexées par ligne, alors que nos itinéraires (marche, vélo,
    voiture) ne contiennent aucune ligne de transport. On s'appuie donc sur
    les modes déclarés dans le profil de mobilité de l'utilisateur.
    """
    api_key = getattr(settings, "VELIB_PRIM_API_KEY", "")
    if not api_key:
        raise TransportAPIError(
            "Clé PRIM absente côté serveur.", source="Île-de-France Mobilités"
        )

    payload = fetch_json(
        PRIM_URL,
        headers={"apikey": api_key},
        cache_key="prim:disruptions",
        source="Île-de-France Mobilités",
    )

    lines_by_disruption = _index_lines_by_disruption(payload.get("lines") or [])
    wanted_modes = _wanted_prim_modes(modes)
    now = datetime.now(PARIS_TZ)

    results = []
    for disruption in payload.get("disruptions") or []:
        if not _is_active(disruption, now):
            continue

        affected_lines = lines_by_disruption.get(disruption.get("id"), [])
        if wanted_modes is not None:
            affected_lines = [
                line
                for line in affected_lines
                if (line.get("mode") or "").lower() in wanted_modes
            ]
            if not affected_lines:
                continue

        results.append(
            {
                "id": disruption.get("id"),
                "title": disruption.get("title"),
                "message": _clean_message(disruption.get("message")),
                "short_message": disruption.get("shortMessage"),
                "cause": disruption.get("cause"),
                "severity": disruption.get("severity"),
                "lines": affected_lines,
            }
        )

    return {
        "disruptions": results[:limit],
        "total": len(results),
        "last_updated": payload.get("lastUpdatedDate"),
    }
