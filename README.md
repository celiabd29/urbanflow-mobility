# UrbanFlow Mobility

Application web progressive (PWA) de mobilité urbaine : planification d'itinéraires
multimodaux, suivi de l'empreinte carbone et signalement collaboratif d'incidents.

Projet réalisé dans le cadre du titre RNCP 36146 (Concepteur Développeur de Solutions
Digitales). L'application est déployée sur Railway et fonctionne aussi hors ligne
(service worker + cache) une fois installée.

## Fonctionnalités

Fonctionnalités principales :

- **Authentification et profil de mobilité** (F1) : inscription, connexion (JWT),
  réinitialisation de mot de passe, préférences de transport (modes favoris, fréquence).
- **Calcul d'itinéraire multimodal** (F2) : carte Leaflet interactive, recherche
  d'adresses, itinéraires vélo / marche / voiture (OpenRouteService) et transport en
  commun (API PRIM d'Île-de-France Mobilités).
- **Données de transport temps réel** (F3) : vélos en libre-service (Vélib' / JCDecaux),
  perturbations du réseau (PRIM), météo du trajet (OpenWeatherMap).
- **Empreinte carbone** (FC1) : calcul des émissions par trajet et bilan mensuel, à
  partir des facteurs ADEME, avec estimation des économies de CO2 par rapport à la voiture.
- **Signalement collaboratif** (FC2) : création d'incidents sur la carte, confirmation
  par vote, suppression par l'auteur.

Fonctionnalités transverses :

- **PWA hors ligne** : installation, cache des tuiles et des données, file de rejeu des
  signalements créés sans connexion.
- **Navigation pas à pas** (turn by turn) à partir des instructions des APIs.
- **Resélection d'un trajet passé** depuis l'historique, avec recalcul.
- **Django Admin** pour la gestion des comptes, trajets et signalements.

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, Leaflet / react-leaflet, Axios, vite-plugin-pwa |
| Backend | Django 4.2, Django REST Framework, SimpleJWT, gunicorn |
| Base de données | PostgreSQL (SQLite en local par défaut) |
| Cartographie | Leaflet + OpenStreetMap |
| APIs externes | OpenRouteService, PRIM (Île-de-France Mobilités), Vélib', JCDecaux, OpenWeatherMap |
| Tests | Django TestCase (backend), Vitest + React Testing Library (frontend) |
| Hébergement | Railway (frontend, backend, base de données) |

## Structure du dépôt

```
.
├── backend/     API Django (apps : users, routing, transport, carbon, incidents)
├── frontend/    Application React + Vite (PWA)
└── design/      Maquettes de référence v0 (voir design/README.md)
```

## Prérequis

- Python 3.9 et pip (backend)
- Node.js >= 22.12 et npm (frontend)

## Lancer en local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # puis renseigner les clés (voir plus bas)
python manage.py migrate
python manage.py runserver      # http://127.0.0.1:8000
```

Sans variable `DATABASE_URL`, le backend utilise SQLite en local. L'API est servie
sous le préfixe `/api/`.

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://127.0.0.1:5173
```

Le frontend appelle par défaut `http://127.0.0.1:8000/api` (surchargeable via
`VITE_API_URL`). Lancer le backend en parallèle.

## Variables d'environnement

Côté backend (voir `backend/.env.example` pour le détail) :

| Variable | Rôle |
|---|---|
| `SECRET_KEY` | Clé secrète Django. Obligatoire en production (le démarrage échoue sans elle). |
| `DEBUG` | `True` en développement, `False` (défaut) en production. |
| `ALLOWED_HOSTS` | Domaines autorisés, séparés par des virgules. |
| `DATABASE_URL` | Connexion PostgreSQL (injectée par Railway). |
| `ORS_API_KEY` | OpenRouteService (itinéraires vélo / marche / voiture). |
| `VELIB_PRIM_API_KEY` | API PRIM (transport en commun + perturbations + Vélib'). |
| `JCDECAUX_API_KEY` | Vélos en libre-service JCDecaux. |
| `OWMAP_API_KEY` | OpenWeatherMap (météo du trajet). |
| `DEMO_ACCOUNT_EMAIL`, `DEMO_ACCOUNT_PASSWORD` | Compte de démonstration recréé à chaque déploiement. |

Côté frontend : `VITE_API_URL` (URL de base de l'API, optionnel en local).

## Tests

```bash
# Backend (Django)
cd backend && source venv/bin/activate
python manage.py test

# Frontend (Vitest)
cd frontend
npm test
```

## Principaux endpoints de l'API

Préfixe commun : `/api/`. L'authentification se fait par token JWT (en-tête
`Authorization: Bearer <token>`).

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register/` | Non | Inscription (renvoie une paire de tokens) |
| POST | `/auth/login/` | Non | Connexion (limité à 5 tentatives/min/IP) |
| POST | `/auth/token/refresh/` | Non | Renouvellement de l'access token |
| GET / PATCH | `/auth/me/` | Oui | Profil de l'utilisateur connecté |
| POST | `/users/password-reset/request/` et `/confirm/` | Non | Réinitialisation du mot de passe |
| POST | `/routing/directions/` | Oui | Calcul d'itinéraire (ORS ou PRIM selon le mode) |
| GET | `/routing/geocode/` | Oui | Recherche d'adresses |
| GET | `/transport/disponibilites/`, `/perturbations/`, `/meteo/` | Oui | Vélos, perturbations, météo |
| POST / GET | `/carbon/trajets/`, `/carbon/estimation/`, `/carbon/historique/`, `/carbon/resume/` | Oui | Trajets et empreinte carbone |
| GET / POST | `/signalements/` | Lecture publique, création authentifiée | Liste et création de signalements |
| GET / DELETE | `/signalements/<id>/` | Détail public, suppression par l'auteur | Détail et suppression |
| POST | `/signalements/<id>/voter/` | Oui | Confirmation d'un signalement |
| GET | `/health/` | Oui | Diagnostic de la base de données |

## Déploiement

Le dépôt est déployé sur Railway (frontend, backend et PostgreSQL sur la même
infrastructure). Le backend applique les migrations et recrée le compte de
démonstration au démarrage (voir `backend/Procfile`).

## Liens

- Application : https://urbanflow-mobility.up.railway.app
- API : https://urbanflow-mobility-production.up.railway.app
- Django Admin : https://urbanflow-mobility-production.up.railway.app/admin/

Un compte de démonstration (`jury@urbanflow.fr`) est disponible ; son mot de passe
figure dans le dossier technique remis au jury.
