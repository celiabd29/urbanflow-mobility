import api from '@/lib/api'

// Libellés d'affichage des profils ORS (le serveur reste la source de vérité
// pour la liste ; ici on ne fait que traduire pour l'interface).
export const PROFILE_LABELS = {
  'foot-walking': 'À pied',
  'cycling-regular': 'Vélo',
  'driving-car': 'Voiture',
  wheelchair: 'Accessible',
  // Servi par PRIM (moteur Navitia) et non par ORS : marche + transport
  // en commun, limité à l'Île-de-France.
  transit: 'Transports',
}

// Vocabulaire des modes d'émission (préférences de profil, segments de trajet :
// bike/rail/bus/car/carpool/walk/scooter) -> profil de routage de la carte.
// Mutualisé entre la présélection du mode (carte) et la resélection d'un trajet
// passé depuis l'écran Trajets.
export const MODE_TO_PROFILE = {
  bike: 'cycling-regular',
  scooter: 'cycling-regular',
  walk: 'foot-walking',
  car: 'driving-car',
  carpool: 'driving-car',
  rail: 'transit',
  bus: 'transit',
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
// Traductions des messages backend en anglais (SimpleJWT + validateurs Django,
// locale en-us) vers des messages clairs en français. Les messages déjà en
// français côté API passent tels quels (aucun motif ne les capte).
const MESSAGES_FR = [
  [/no active account/i, 'Email ou mot de passe incorrect.'],
  [/already exists/i, 'Cet email est déjà utilisé.'],
  [/too short|at least \d+ char/i, 'Le mot de passe doit contenir au moins 8 caractères.'],
  [/too common/i, 'Ce mot de passe est trop courant, choisissez-en un autre.'],
  [/entirely numeric/i, 'Le mot de passe ne peut pas être uniquement composé de chiffres.'],
  [/too similar/i, 'Le mot de passe est trop proche de vos informations personnelles.'],
  [/valid email|enter a valid email/i, 'Adresse email invalide.'],
  [/may not be blank|this field is required|required/i, 'Veuillez remplir tous les champs obligatoires.'],
  [/token.*not valid|given token/i, 'Session expirée. Reconnectez-vous.'],
]

function toFrench(raw) {
  for (const [pattern, fr] of MESSAGES_FR) if (pattern.test(raw)) return fr
  return null
}

/**
 * Transforme une erreur axios en message clair pour l'utilisateur (français).
 *
 * - Annulation volontaire -> null (l'appelant n'affiche rien).
 * - Panne réseau (pas de réponse) -> message de connexion.
 * - Réponse serveur -> on extrait le message ({detail} ou {champ: [msg]}),
 *   on le traduit s'il est en anglais, sinon on le montre tel quel ; à défaut,
 *   le fallback contextuel.
 */
export function extractError(err, fallback = 'Une erreur est survenue.') {
  if (err?.name === 'CanceledError') return null // annulation volontaire
  if (!err?.response) return 'Problème de connexion. Vérifiez votre réseau internet.'

  const data = err.response.data
  let raw = null
  if (typeof data?.detail === 'string') {
    raw = data.detail
  } else if (data && typeof data === 'object') {
    // Erreurs de champ DRF : { champ: ["message"] } ou { champ: "message" }.
    const first = Object.values(data)[0]
    raw = Array.isArray(first) ? first[0] : first
  }

  if (typeof raw !== 'string') return fallback
  return toFrench(raw) || raw || fallback
}
