// Transforme un itinéraire (ORS marche/vélo/voiture OU transit PRIM) en une
// liste d'étapes de navigation homogène, consommée par la bannière et la liste
// de navigation. Aucune instruction n'est recalculée : on structure ce que les
// APIs renvoient déjà (steps ORS, sections PRIM).

const TRANSIT_TITLES = {
  walking: 'Marche',
  transfer: 'Correspondance',
  waiting: 'Attente',
}

function transitTitle(section) {
  if (section.type === 'public_transport') {
    return `${section.mode || 'Transport'} ${section.line || ''}`.trim()
  }
  return TRANSIT_TITLES[section.type] || 'Étape'
}

function transitDetail(section) {
  if (section.type === 'public_transport') {
    const dir = section.direction ? ` · dir. ${section.direction}` : ''
    return `${section.from || ''} → ${section.to || ''}${dir}`.trim()
  }
  if (section.to) return `Jusqu'à ${section.to}`
  return null
}

/**
 * Étapes de navigation d'un itinéraire, format unifié :
 * { kind, title, detail, distanceM, durationS, point:[lat,lon], ... }
 */
export function buildNavSteps(route, profile) {
  if (!route) return []

  // Transport en commun : les sections PRIM SONT déjà les étapes.
  if (profile === 'transit') {
    const sections = route.journeys?.[0]?.sections || []
    return sections
      .filter((s) => s.duration_s >= 30 || s.type === 'public_transport')
      .map((s) => ({
        kind: 'transit',
        transitType: s.type,
        mode: s.mode,
        lineColor: s.line_color,
        title: transitTitle(s),
        detail: transitDetail(s),
        distanceM: s.distance_m,
        durationS: s.duration_s,
        point: s.coordinates?.[0] || null,
      }))
  }

  // ORS : marche / vélo / voiture, pas-à-pas fourni par le backend.
  return (route.steps || []).map((s) => ({
    kind: 'road',
    turnType: s.type,
    // « Tournez à gauche sur Rue de Rivoli » quand la voie est nommée.
    title: s.name ? `${s.instruction} sur ${s.name}` : s.instruction,
    detail: null,
    distanceM: s.distance_m,
    durationS: s.duration_s,
    point: s.point || null,
  }))
}

/**
 * Distance approximative en mètres entre deux points [lat, lon] (Haversine).
 * Sert à l'avance automatique quand l'utilisateur approche du point d'une étape.
 */
export function distanceMeters(a, b) {
  if (!a || !b) return Infinity
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
