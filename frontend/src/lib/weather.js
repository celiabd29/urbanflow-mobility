import api from '@/lib/api'

/** Conditions météo au point demandé (passe par notre backend). */
export async function getWeather(lat, lng, { signal } = {}) {
  const { data } = await api.get('/transport/meteo/', {
    params: { lat, lng },
    signal,
  })
  return data
}

// Libellés de repli : l'API renvoie déjà une description en français, mais
// elle peut manquer. Les clés correspondent aux familles de `weather.py`.
export const CONDITION_LABELS = {
  clear: 'Ciel dégagé',
  clouds: 'Nuageux',
  rain: 'Pluie',
  drizzle: 'Bruine',
  thunderstorm: 'Orage',
  snow: 'Neige',
  fog: 'Brouillard',
}

/**
 * Y a-t-il de quoi hésiter à prendre le vélo ?
 * Vrai s'il pleut déjà, ou si des précipitations sont annoncées.
 */
export function hasPrecipitation(report) {
  if (!report) return false
  return Boolean(report.current?.is_precipitation || report.upcoming_precipitation)
}

/** "2026-07-19 15:00:00" -> "15h" */
export function formatSlotHour(value) {
  if (!value) return ''
  const hour = value.split(' ')[1]?.slice(0, 2)
  return hour ? `${Number(hour)}h` : ''
}
