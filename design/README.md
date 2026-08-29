# Maquettes v0 | UrbanFlow Mobility

Référence de **conception** de l'application. Source : export v0 (Next.js + Tailwind v4 + shadcn),
copié ici pour être versionné plutôt que de dépendre du dossier `Downloads`.

> Ce dossier documente les **maquettes d'origine**. L'application réelle est dans
> `frontend/` (Vite + React + JSX). Les maquettes ont servi de base visuelle : le
> tableau ci-dessous fait le lien entre chaque maquette et l'écran effectivement
> développé. **Toutes les maquettes ont été implémentées**, et l'application va
> aujourd'hui au-delà (voir « Au-delà des maquettes »).

## Contenu

| Dossier | Description |
|---|---|
| `v0/maquettes/` | Captures annotées « ÉCRAN N : … » |
| `v0/components/` | Les écrans en Next.js / TSX (référence, non branchés à l'app) |
| `v0/globals.css` | Design system (tokens de thème) |
| `v0/lib/`, `v0/components.json` | Helper `cn()` et config shadcn |

## Les 7 écrans : maquette vers écran réel

| N° | Écran | Thème | Maquette | Écran réel |
|----|-------|-------|----------|------------|
| 1 | Connexion | sombre | `login-screen.tsx` | ✅ `frontend/src/pages/Login.jsx` |
| 2 | Inscription | sombre | `register-screen.tsx` | ✅ `frontend/src/pages/Register.jsx` |
| 3 | Accueil | clair | `home-screen.tsx` | ✅ `frontend/src/pages/Home.jsx` (recherche, chips de mode, trajets récents + CO₂) |
| 4 | Planificateur d'itinéraires | clair | `route-screen.tsx` | ✅ `frontend/src/pages/Map.jsx` + `components/RouteSheet.jsx` |
| 5 | Empreinte carbone | clair | `carbon-screen.tsx` | ✅ `frontend/src/pages/CarbonFootprint.jsx` |
| 6 | Signalement d'incident | clair | `incident-screen.tsx` | ✅ `frontend/src/pages/ReportIncident.jsx` |
| 7 | Profil utilisateur | clair | `profile-screen.tsx` | ✅ `frontend/src/pages/Profile.jsx` |

Le **thème clair** des écrans 3 à 7 est bien rendu dans l'application (couleurs
explicites), en complément du thème sombre des écrans d'authentification.

### Divergence assumée sur l'écran 4 (planificateur)

La maquette montre une *bottom sheet* **statique** illustrant un trajet figé
(Vélo → RER → Marche). L'écran réel est une **carte Leaflet interactive** :
recherche d'adresses réelle, calcul d'itinéraire en direct (ORS pour
vélo/marche/voiture, PRIM/Île-de-France Mobilités pour le transport en commun),
et panneau repliable à deux crans. L'implémentation est donc plus complète que
la maquette.

### Éléments de maquette non repris (choix documentés, cf. dossier p.32)

| Maquette | Statut |
|---|---|
| « Continuer avec Google » (`login-screen.tsx`) | Non implémenté : OAuth hors périmètre v1 ; remplacé par « Mot de passe oublié ? » |
| Crayon d'édition du profil (`profile-screen.tsx`) | Non fonctionnel : affiché « Bientôt disponible » |
| « Ajouter une photo » sur signalement (`incident-screen.tsx`) | Non implémenté : stockage Railway éphémère (Cloudinary envisagé en évolution) |

## Design system

- Vert primaire : `#1D9E75`
- Fond sombre (écrans d'authentification) : `#0f172a`
- Fond clair (écrans applicatifs) : `#f8fafc`
- `--radius: 0.875rem`

Ces tokens sont portés dans `frontend/src/index.css` ; les écrans clairs
utilisent en plus des couleurs explicites (`#f8fafc`, `#1D9E75`, etc.).

## Au-delà des maquettes

L'application réelle ajoute plusieurs fonctionnalités absentes des maquettes v0 :

- **Transport en commun** : itinéraires multimodaux via l'API **PRIM** (moteur
  Navitia d'Île-de-France Mobilités) : l'écart technique « ORS ne fait pas de
  transport public » est **résolu** (ORS reste utilisé pour vélo/marche/voiture).
- **Navigation pas-à-pas** (turn-by-turn) : `components/NavigationBanner.jsx`,
  `components/NavigationSheet.jsx`.
- **Mode hors ligne (PWA)** : service worker, cache des tuiles et des données,
  file de rejeu des signalements : `components/OfflineBadge.jsx`,
  `lib/offlineStore.js`, `lib/reportSync.js`.
- **Réinitialisation de mot de passe** : `pages/ForgotPassword.jsx`,
  `pages/ResetPassword.jsx`.
- **Vélos en libre-service** (Vélib'/JCDecaux) : `components/BikeAvailability.jsx`.
- **Météo** (OpenWeatherMap) : `components/WeatherBanner.jsx`.
- **Perturbations** (PRIM) : `components/DisruptionAlert.jsx`.
- **Signalements** : confirmation par vote et suppression par l'auteur.
- **Trajets** : suppression et resélection d'un trajet passé.
- **Onboarding** du profil de mobilité : `pages/MobilityProfile.jsx`.
