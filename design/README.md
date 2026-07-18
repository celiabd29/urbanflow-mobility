# Maquettes v0 — UrbanFlow Mobility

Référence de conception de l'application. Source : export v0 (Next.js + Tailwind v4 + shadcn),
copié ici pour être versionné plutôt que de dépendre du dossier `Downloads`.

## Contenu

| Dossier | Description |
|---|---|
| `v0/maquettes/` | 10 captures annotées « ÉCRAN N — … » |
| `v0/components/` | Les écrans en Next.js / TSX |
| `v0/globals.css` | Design system (tokens de thème) |
| `v0/lib/`, `v0/components.json` | Helper `cn()` et config shadcn |

## Les 7 écrans

| N° | Écran | Thème | État dans l'app |
|----|-------|-------|-----------------|
| 1 | Connexion | sombre | ✅ implémenté (`pages/Login.jsx`) |
| 2 | Inscription | sombre | ✅ implémenté (`pages/Register.jsx`) |
| 3 | Accueil | clair | ⚠️ placeholder — la maquette prévoit recherche, filtres de mode, trajets récents avec CO₂ |
| 4 | Planificateur d'itinéraires | clair | ⚠️ diverge — la maquette prévoit une *bottom sheet* multimodale (Vélo → RER → Marche) avec CO₂ |
| 5 | Empreinte carbone | clair | ❌ non construit |
| 6 | Signalement d'incident | clair | ❌ non construit |
| 7 | Profil utilisateur | clair | ⚠️ placeholder — préférences de mobilité, statistiques |

## Design system

- Vert primaire : `#1D9E75`
- Fond sombre (écrans d'authentification) : `#0f172a`
- Fond clair (écrans applicatifs) : `#f8fafc`
- `--radius: 0.875rem`

Les tokens sont déjà portés dans `frontend/src/index.css`, **mais en thème sombre uniquement** :
les écrans 3 à 7 sont conçus en thème clair.

## Écart technique connu

Les écrans 3, 4, 5 et 7 reposent sur les **transports en commun** (RER, Bus).
OpenRouteService, utilisé par `backend/routing/`, ne calcule **pas** d'itinéraires
en transport public. Ce point doit être tranché avant d'étendre le planificateur
(pistes : API Navitia, ou OpenTripPlanner avec des données GTFS).
