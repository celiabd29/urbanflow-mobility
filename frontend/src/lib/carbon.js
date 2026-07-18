import api from '@/lib/api'

/** Enregistre un trajet et renvoie son empreinte calculée par le serveur. */
export async function saveTrajet(segments) {
  const { data } = await api.post('/carbon/trajets/', { segments })
  return data
}

/** Bilan carbone du mois en cours. */
export async function getMonthlySummary({ signal } = {}) {
  const { data } = await api.get('/carbon/resume/', { signal })
  return data
}

// Libellés et couleurs des modes, alignés sur la maquette écran 5.
export const MODE_PRESENTATION = {
  bike: { label: 'Vélo', color: '#1D9E75' },
  walk: { label: 'Marche', color: '#1D9E75' },
  scooter: { label: 'Trottinette', color: '#1D9E75' },
  rail: { label: 'RER / Métro', color: '#6366f1' },
  bus: { label: 'Bus', color: '#2563eb' },
  carpool: { label: 'Covoiturage', color: '#f59e0b' },
  car: { label: 'Voiture', color: '#ef4444' },
}

/**
 * Convertit un itinéraire calculé en segments exploitables par le calculateur.
 *
 * Les trajets transit sont déjà découpés en sections ; les trajets ORS sont
 * d'un seul tenant, sur le mode du profil demandé.
 */
const PROFILE_TO_MODE = {
  'foot-walking': 'walk',
  wheelchair: 'walk',
  'cycling-regular': 'bike',
  'driving-car': 'car',
}

const NAVITIA_MODE_TO_MODE = {
  rer: 'rail',
  metro: 'rail',
  train: 'rail',
  tramway: 'rail',
  tram: 'rail',
  transilien: 'rail',
  rapidtransit: 'rail',
  localtrain: 'rail',
  longdistancetrain: 'rail',
  bus: 'bus',
  shuttle: 'bus',
  coach: 'bus',
}

export function routeToSegments(route, profile) {
  if (!route) return []

  const journey = route.journeys?.[0]
  if (journey?.sections?.length) {
    return journey.sections
      .filter((section) => section.distance_m > 0)
      .map((section) => {
        const mode =
          section.type === 'public_transport'
            ? NAVITIA_MODE_TO_MODE[
                (section.mode || '').toLowerCase().replace(/\s/g, '')
              ] || 'bus'
            : 'walk'
        return { mode, distance_km: section.distance_m / 1000 }
      })
  }

  if (route.distance_m > 0) {
    return [
      {
        mode: PROFILE_TO_MODE[profile] || 'walk',
        distance_km: route.distance_m / 1000,
      },
    ]
  }

  return []
}

/** 1438.3 g -> "1,44 kg" ; 49.4 g -> "49 g" */
export function formatCo2(grams) {
  if (grams == null) return '—'
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2).replace('.', ',')} kg`
  }
  return `${Math.round(grams)} g`
}
