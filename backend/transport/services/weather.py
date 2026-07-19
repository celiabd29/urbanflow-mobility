"""Conditions météo (OpenWeatherMap), pour éclairer le choix du mode.

Deux appels distincts de l'offre gratuite :
- /weather  : les conditions actuelles au point de départ ;
- /forecast : les créneaux à venir, pour savoir si la pluie arrive.

One Call 3.0 aurait fourni les deux en une requête, mais relève d'une offre
payante (401 avec notre clé).
"""

from django.conf import settings

from .base import TransportAPIError, fetch_json

OWM_BASE = "https://api.openweathermap.org/data/2.5"

# Nombre de créneaux de prévision examinés (3 h chacun) : couvre les
# prochaines heures, horizon utile pour un trajet urbain.
FORECAST_SLOTS = 2

# Familles de conditions, d'après les codes OpenWeatherMap.
# https://openweathermap.org/weather-conditions
PRECIPITATION_CONDITIONS = {"thunderstorm", "drizzle", "rain", "snow"}


def _condition_from_code(code):
    """Ramène le code OpenWeatherMap à une famille simple et exploitable."""
    if 200 <= code < 300:
        return "thunderstorm"
    if 300 <= code < 400:
        return "drizzle"
    if 500 <= code < 600:
        return "rain"
    if 600 <= code < 700:
        return "snow"
    if 700 <= code < 800:
        return "fog"
    if code == 800:
        return "clear"
    return "clouds"


def _api_key():
    key = getattr(settings, "OWMAP_API_KEY", "")
    if not key:
        raise TransportAPIError(
            "Clé OWMAP_API_KEY absente côté serveur.", source="OpenWeatherMap"
        )
    return key


def _common_params(lat, lon):
    return {
        "lat": lat,
        "lon": lon,
        "units": "metric",
        "lang": "fr",
        "appid": _api_key(),
    }


def current_weather(lat, lon):
    """Conditions actuelles : température, famille de conditions, vent."""
    payload = fetch_json(
        f"{OWM_BASE}/weather",
        params=_common_params(lat, lon),
        cache_key=f"owm:current:{lat:.3f}:{lon:.3f}",
        source="OpenWeatherMap",
    )

    entry = (payload.get("weather") or [{}])[0]
    condition = _condition_from_code(entry.get("id", 800))

    return {
        "temperature_c": round((payload.get("main") or {}).get("temp", 0), 1),
        "feels_like_c": round((payload.get("main") or {}).get("feels_like", 0), 1),
        "condition": condition,
        "description": entry.get("description", ""),
        "icon": entry.get("icon"),
        "wind_speed_ms": round((payload.get("wind") or {}).get("speed", 0), 1),
        "is_precipitation": condition in PRECIPITATION_CONDITIONS,
    }


def upcoming_precipitation(lat, lon):
    """
    Précipitations attendues dans les prochaines heures.

    Renvoie None si rien n'est prévu, sinon le premier créneau concerné —
    ce qui permet de dire « pluie prévue » plutôt que « il pleut ».
    """
    payload = fetch_json(
        f"{OWM_BASE}/forecast",
        params={**_common_params(lat, lon), "cnt": FORECAST_SLOTS},
        cache_key=f"owm:forecast:{lat:.3f}:{lon:.3f}",
        source="OpenWeatherMap",
    )

    for slot in payload.get("list") or []:
        entry = (slot.get("weather") or [{}])[0]
        condition = _condition_from_code(entry.get("id", 800))
        if condition in PRECIPITATION_CONDITIONS:
            return {
                "condition": condition,
                "description": entry.get("description", ""),
                "expected_at": slot.get("dt_txt"),
                "temperature_c": round((slot.get("main") or {}).get("temp", 0), 1),
            }
    return None


def weather_report(lat, lon):
    """
    Météo exploitable par le planificateur.

    Une panne des prévisions ne doit pas priver l'utilisateur des conditions
    actuelles : on renvoie ce qu'on a obtenu.
    """
    report = {"current": current_weather(lat, lon), "upcoming_precipitation": None}

    try:
        report["upcoming_precipitation"] = upcoming_precipitation(lat, lon)
    except TransportAPIError:
        # Les conditions actuelles suffisent à afficher le bandeau.
        report["forecast_unavailable"] = True

    return report
