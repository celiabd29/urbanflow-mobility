"""Calcul de l'empreinte carbone d'un trajet.

Facteurs d'émission de référence : ADEME (documentés dans le dossier
technique). Navitia fournit aussi un CO₂ par section, mais avec ses propres
facteurs — sur un trajet RER de 12,3 km il annonce 67,9 g contre 49,4 g avec
l'ADEME. On s'en tient aux facteurs du dossier pour que l'application et la
documentation disent la même chose.
"""

# Grammes de CO₂ par kilomètre et par personne.
EMISSION_FACTORS = {
    "car": 118,       # voiture thermique individuelle
    "carpool": 48,    # covoiturage, base 2,5 passagers
    "bus": 14,        # bus urbain thermique
    "rail": 4,        # RER / train / métro
    "bike": 0,        # vélo
    "walk": 0,        # marche
    "scooter": 0,     # trottinette
}

# Mode de référence pour calculer l'économie réalisée.
REFERENCE_MODE = "car"

# Correspondance entre les profils d'itinéraire et les modes d'émission.
PROFILE_TO_MODE = {
    "foot-walking": "walk",
    "wheelchair": "walk",
    "cycling-regular": "bike",
    "driving-car": "car",
}

# Correspondance entre les modes physiques Navitia et les modes d'émission.
NAVITIA_MODE_TO_MODE = {
    "rer": "rail",
    "metro": "rail",
    "train": "rail",
    "tramway": "rail",
    "tram": "rail",
    "transilien": "rail",
    "rapidtransit": "rail",
    "localtrain": "rail",
    "longdistancetrain": "rail",
    "bus": "bus",
    "shuttle": "bus",
    "coach": "bus",
    "walking": "walk",
}


class CarbonError(Exception):
    """Donnée d'entrée invalide, transformée en 400 par la vue."""


def mode_from_navitia(physical_mode):
    """Convertit un mode physique Navitia en mode d'émission connu."""
    key = (physical_mode or "").strip().lower().replace(" ", "")
    return NAVITIA_MODE_TO_MODE.get(key, "bus")  # repli prudent : le plus émetteur


def compute_footprint(segments):
    """
    Empreinte d'un trajet découpé en segments.

    Chaque segment vaut {"mode": ..., "distance_km": ...}. On multiplie la
    distance par le facteur du mode, puis on compare au même trajet parcouru
    intégralement en voiture individuelle.
    """
    if not isinstance(segments, list) or not segments:
        raise CarbonError("Le trajet doit contenir au moins un segment.")

    total_km = 0.0
    total_co2 = 0.0
    per_mode = {}

    for index, segment in enumerate(segments):
        if not isinstance(segment, dict):
            raise CarbonError(f"Segment {index} invalide.")

        mode = segment.get("mode")
        if mode not in EMISSION_FACTORS:
            raise CarbonError(
                f"Mode inconnu : {mode}. "
                f"Valeurs autorisées : {', '.join(sorted(EMISSION_FACTORS))}."
            )

        try:
            distance_km = float(segment.get("distance_km"))
        except (TypeError, ValueError):
            raise CarbonError(f"Distance invalide sur le segment {index}.")

        if distance_km < 0:
            raise CarbonError("Une distance ne peut pas être négative.")

        co2 = distance_km * EMISSION_FACTORS[mode]
        total_km += distance_km
        total_co2 += co2

        aggregate = per_mode.setdefault(mode, {"mode": mode, "distance_km": 0.0, "co2_g": 0.0})
        aggregate["distance_km"] += distance_km
        aggregate["co2_g"] += co2

    # Économie = ce qu'aurait coûté le même kilométrage en voiture.
    car_equivalent = total_km * EMISSION_FACTORS[REFERENCE_MODE]
    saved = car_equivalent - total_co2

    return {
        "distance_km": round(total_km, 3),
        "co2_emis_g": round(total_co2, 1),
        "co2_economise_g": round(saved, 1),
        "co2_voiture_equivalent_g": round(car_equivalent, 1),
        "modes_utilises": [
            {
                "mode": item["mode"],
                "distance_km": round(item["distance_km"], 3),
                "co2_g": round(item["co2_g"], 1),
            }
            for item in sorted(per_mode.values(), key=lambda x: -x["distance_km"])
        ],
    }
