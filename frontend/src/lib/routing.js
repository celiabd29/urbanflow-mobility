import api from '@/lib/api'

// Libellés d'affichage des profils ORS (le serveur reste la source de vérité
// pour la liste ; ici on ne fait que traduire pour l'interface).
export const PROFILE_LABELS = {
  'foot-walking': 'À pied',
  'cycling-regular': 'Vélo',
  'driving-car': 'Voiture',
  wheelchair: 'Accessible',
}

/**
 * Recherche d'adresses (autocomplétion).
 * `signal` permet d'annuler une requête devenue obsolète : sans ça, une
 * réponse lente pour "gar" peut écraser celle de "gare de lyon".
 */
export async function geocode(query, { signal } = {}) {
  const { data } = await api.get('/routing/geocode/', {
    params: { q: query },
    signal,
  })
  return data.results
}

/** Calcule un itinéraire. start/end au format [longitude, latitude]. */
export async function getDirections(start, end, profile) {
  const { data } = await api.post('/routing/directions/', {
    start,
    end,
    profile,
  })
  // data = { distance_m, duration_s, coordinates: [[lat, lon], ...] }
  return data
}

/** Modes disponibles, définis côté serveur. */
export async function getProfiles() {
  const { data } = await api.get('/routing/profiles/')
  return data.profiles
}

/** 1186 -> "1,2 km" ; 850 -> "850 m" */
export function formatDistance(meters) {
  if (meters == null) return '—'
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1).replace('.', ',')} km`
    : `${Math.round(meters)} m`
}

/** 852 -> "14 min" ; 4500 -> "1 h 15" */
export function formatDuration(seconds) {
  if (seconds == null) return '—'
  const total = Math.round(seconds / 60)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${total} min`
}

/** Extrait un message lisible d'une erreur axios (DRF renvoie { detail }). */
export function extractError(err, fallback = 'Une erreur est survenue.') {
  if (err?.name === 'CanceledError') return null // annulation volontaire
  return err?.response?.data?.detail || fallback
}
