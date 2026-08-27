import api from '@/lib/api'

/**
 * Disponibilité des vélos en libre-service autour d'un point.
 * Passe par notre backend : les clés d'API ne transitent jamais ici.
 */
export async function getBikeAvailability(lat, lng, radius = 500, { signal } = {}) {
  const { data } = await api.get('/transport/disponibilites/', {
    params: { lat, lng, rayon: radius },
    signal,
  })
  return data
}

/**
 * Perturbations en cours.
 * Sans argument, le backend retombe sur les modes du profil de mobilité.
 */
export async function getDisruptions(modes, { signal } = {}) {
  const { data } = await api.get('/transport/perturbations/', {
    params: modes?.length ? { modes: modes.join(',') } : {},
    signal,
  })
  return data
}

/** Agrège les vélos disponibles sur un ensemble de stations. */
export function summariseStations(stations = []) {
  return stations.reduce(
    (totals, station) => ({
      bikes: totals.bikes + (station.bikes_available || 0),
      mechanical: totals.mechanical + (station.mechanical_bikes || 0),
      electric: totals.electric + (station.electric_bikes || 0),
      docks: totals.docks + (station.docks_available || 0),
    }),
    { bikes: 0, mechanical: 0, electric: 0, docks: 0 },
  )
}

// Couleurs par gravité, alignées sur les valeurs renvoyées par PRIM.
// Teintes adaptées au panneau sombre du planificateur.
export const SEVERITY_STYLES = {
  BLOQUANTE: 'border-red-300 bg-red-50 text-red-700',
  PERTURBEE: 'border-amber-300 bg-amber-50 text-amber-700',
}
export const DEFAULT_SEVERITY_STYLE =
  'border-slate-200 bg-slate-100 text-slate-500'

/** Libellés français des modes, pour l'affichage. */
export const MODE_LABELS = {
  bike: 'vélo',
  bus: 'bus',
  rail: 'RER / train / métro',
  car: 'voiture',
  walk: 'marche',
}
