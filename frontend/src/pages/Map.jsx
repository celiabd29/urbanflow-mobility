import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ThumbsUp, Trash2, TriangleAlert } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import BottomNav from '@/components/BottomNav'
import NavigationBanner from '@/components/NavigationBanner'
import NavigationSheet from '@/components/NavigationSheet'
import OfflineBadge from '@/components/OfflineBadge'
import RouteSheet, { NAV_HEIGHT } from '@/components/RouteSheet'
import SearchOverlay from '@/components/SearchOverlay'
import api from '@/lib/api'
import { estimateFootprint, routeToSegments, saveTrajet } from '@/lib/carbon'
import { buildNavSteps, distanceMeters } from '@/lib/navigation'
import { networkFirst, readCache, saveCache } from '@/lib/offlineStore'
import { onPendingChanged } from '@/lib/reportSync'
import {
  MODE_TO_PROFILE,
  PROFILE_LABELS,
  extractError,
  geocode,
  getDirections,
  getProfiles,
} from '@/lib/routing'

// --- Correctif indispensable avec un bundler (Vite) ---
// Leaflet construit les URL de ses images de marqueur par défaut à partir du
// chemin du CSS. Avec Vite, ces chemins ne résolvent pas -> marqueurs invisibles.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const PARIS = [48.8566, 2.3522]
const ROUTE_COLOR = '#1d9e75' // vert primaire UrbanFlow


// Hauteur du panneau réduit : poignée, chips/en-tête et bouton d'action. La
// barre de navigation est en dessous (le panneau est posé à bottom: NAV_HEIGHT),
// pas incluse ici.
const COLLAPSED_HEIGHT = 236

/**
 * Hauteur du cran étendu.
 *
 * Plafonnée à 62 % : au-delà, il ne restait qu'une bande d'environ 70 px de
 * carte, insuffisante pour cadrer le tracé et ses pastilles A/B, le point de
 * départ finissait sous le panneau. Le contenu défile de toute façon.
 */
function expandedHeight() {
  const viewport = typeof window === 'undefined' ? 812 : window.innerHeight
  // Le plancher est indispensable : sur un écran court, le calcul pouvait
  // retomber à la hauteur du cran réduit, et le tap n'ouvrait alors plus rien.
  return Math.max(
    COLLAPSED_HEIGHT + 140,
    Math.min(Math.round(viewport * 0.62), viewport - 200),
  )
}

// Pastilles A/B en HTML pur : pas d'image à charger, donc aucun risque
// de marqueur invisible comme avec les icônes par défaut.
function letterIcon(letter, background) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${background};color:#fff;width:28px;height:28px;
      border-radius:9999px;display:flex;align-items:center;justify-content:center;
      font:600 13px/1 ui-sans-serif,system-ui,sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.4);border:2px solid #fff;
    ">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const START_ICON = letterIcon('A', '#1d9e75')
const END_ICON = letterIcon('B', '#ef4444')

// Pastille de l'étape de navigation en cours : point vert cerclé de blanc.
const STEP_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;border-radius:9999px;background:#1d9e75;
    border:3px solid #fff;box-shadow:0 0 0 4px rgba(29,158,117,.35);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// Présentation des incidents par type : emoji + libellé + couleur du contour.
const INCIDENT_META = {
  travaux: { emoji: '🚧', label: 'Travaux', color: '#f59e0b' },
  accident: { emoji: '🚗', label: 'Accident', color: '#ef4444' },
  panne: { emoji: '🔧', label: 'Panne', color: '#2563eb' },
  autre: { emoji: '❗', label: 'Autre', color: '#64748b' },
}

// Icônes mémorisées : une pastille blanche cerclée de la couleur du type,
// avec l'emoji au centre. Pas d'image à charger.
const incidentIcons = {}
function incidentIcon(type) {
  if (incidentIcons[type]) return incidentIcons[type]
  const meta = INCIDENT_META[type] || INCIDENT_META.autre
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:9999px;background:#fff;
      display:flex;align-items:center;justify-content:center;font-size:15px;
      box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid ${meta.color};
    ">${meta.emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
  incidentIcons[type] = icon
  return icon
}

/** "2026-08-22T14:57:00Z" -> "22 août, 14:57" */
function formatIncidentDate(value) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Recentre sur l'utilisateur, sauf si un itinéraire est affiché,
// auquel cas c'est le cadrage de l'itinéraire qui prime.
function RecenterMap({ position, disabled }) {
  const map = useMap()
  useEffect(() => {
    if (position && !disabled) map.flyTo(position, 15)
  }, [position, disabled, map])
  return null
}

/**
 * Cadre la carte sur le tracé, en réservant la place du panneau bas.
 *
 * Sans cette réserve, le point d'arrivée se retrouve masqué sous le panneau.
 * Le recadrage est relancé à chaque changement de cran.
 */
function FitRoute({ coordinates, bottomInset }) {
  const map = useMap()

  useEffect(() => {
    if (!coordinates?.length) return

    const mapHeight = map.getSize().y
    // Leaflet cadre les coordonnées, pas les pastilles A/B qui les surmontent :
    // sans cette réserve, le point A passait sous le panneau en cran étendu.
    const MARKER = 32
    const topInset = 100 + MARKER // barre de recherche flottante
    const bottom = Math.min(
      bottomInset + MARKER,
      // Une bande trop fine empêcherait tout cadrage : on la garde viable,
      // quitte à dézoomer davantage.
      Math.max(0, mapHeight - topInset - 72),
    )

    map.fitBounds(coordinates, {
      paddingTopLeft: [24, topInset],
      paddingBottomRight: [24, bottom],
    })
  }, [coordinates, bottomInset, map])

  return null
}

/** En navigation, recentre en douceur sur le point de l'étape courante. */
function FollowStep({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point) map.flyTo(point, 16, { duration: 0.6 })
  }, [point, map])
  return null
}

export default function MapPage() {
  const [searchParams] = useSearchParams()

  // --- Carte ---
  const [position, setPosition] = useState(null)
  const [status, setStatus] = useState('locating') // locating | ok | error
  const [message, setMessage] = useState('Localisation en cours…')

  // --- Saisie ---
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [profiles, setProfiles] = useState([])
  // Resélection d'un trajet passé depuis l'écran Trajets :
  // /map?from=<adresse>&to=<adresse>&mode=<profil>. On lit les paramètres
  // une seule fois (au montage) pour ne pas relancer le pré-remplissage.
  const [replayParams] = useState(() => ({
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  }))
  const [pendingReplayCalc, setPendingReplayCalc] = useState(false)
  // Les chips de l'accueil ouvrent la carte avec un mode déjà choisi
  // (/map?mode=cycling-regular).
  const modeFromHome = searchParams.get('mode')
  const [profile, setProfile] = useState(() => modeFromHome || 'foot-walking')
  // La présélection selon la préférence du profil ne s'applique qu'une fois,
  // et jamais après un choix manuel ou un mode imposé par l'accueil.
  const prefApplied = useRef(false)
  const userTouchedMode = useRef(false)

  // --- Résultat ---
  const [route, setRoute] = useState(null)
  // Vrai quand l'itinéraire affiché vient du cache IndexedDB (hors ligne).
  const [routeFromCache, setRouteFromCache] = useState(false)
  const [estimate, setEstimate] = useState(null)
  const [footprint, setFootprint] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // --- Incidents affichés sur la carte ---
  const [incidents, setIncidents] = useState([])
  // Vrai quand les incidents affichés viennent du cache IndexedDB (hors ligne).
  const [incidentsFromCache, setIncidentsFromCache] = useState(false)

  // --- Panneau ---
  const [phase, setPhase] = useState('search') // search | result
  const [expanded, setExpanded] = useState(false)
  const [maxHeight, setMaxHeight] = useState(expandedHeight)

  // --- Navigation pas à pas ---
  const [navigating, setNavigating] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  // Étapes de guidage, unifiées entre ORS (steps) et transit (sections).
  const navSteps = useMemo(() => buildNavSteps(route, profile), [route, profile])
  const currentStep = navSteps[stepIndex] || null

  const sheetHeight = expanded ? maxHeight : COLLAPSED_HEIGHT

  useEffect(() => {
    const onResize = () => setMaxHeight(expandedHeight())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Les modes viennent du serveur ; repli sur la liste locale si l'appel échoue.
  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch(() => setProfiles(Object.keys(PROFILE_LABELS)))
  }, [])

  // Présélection du mode selon la préférence principale du profil (F1) : au
  // chargement, on ouvre la carte sur le mode favori (modes[0]) plutôt que sur
  // « À pied ». On ne le fait pas si l'accueil a déjà imposé un mode (?mode=)
  // ni après un choix manuel, et une seule fois. Comportement par défaut
  // conservé si aucune préférence n'est enregistrée (nouveau compte).
  useEffect(() => {
    if (modeFromHome || prefApplied.current) return
    const controller = new AbortController()
    api
      .get('/auth/me/', { signal: controller.signal })
      .then(({ data }) => {
        if (prefApplied.current || userTouchedMode.current) return
        const primary = data?.transport_preferences?.modes?.[0]
        const mapped = primary && MODE_TO_PROFILE[primary]
        if (mapped) {
          prefApplied.current = true
          setProfile(mapped)
        }
      })
      // Hors ligne ou non connecté : on garde le mode par défaut, sans erreur.
      .catch(() => {})
    return () => controller.abort()
  }, [modeFromHome])

  // Resélection d'un trajet passé : on géocode les adresses départ/arrivée
  // reçues en paramètre pour retrouver leurs coordonnées, puis on déclenche un
  // vrai recalcul (pas une relecture figée). Une seule fois, au montage.
  useEffect(() => {
    if (!replayParams.from && !replayParams.to) return
    let active = true
    ;(async () => {
      if (replayParams.from) {
        setFromQuery(replayParams.from)
        try {
          const results = await geocode(replayParams.from)
          if (active && results[0]) setFrom(results[0])
        } catch {
          // Géocodage indisponible : les champs restent éditables manuellement.
        }
      }
      if (replayParams.to) {
        setToQuery(replayParams.to)
        try {
          const results = await geocode(replayParams.to)
          if (active && results[0]) setTo(results[0])
        } catch {
          /* idem */
        }
      }
      if (active) setPendingReplayCalc(true)
    })()
    return () => {
      active = false
    }
  }, [replayParams])

  // Charge les signalements actifs à afficher sur la carte (endpoint public).
  // Network-first : frais si le réseau répond, sinon le dernier instantané
  // IndexedDB, comme les trajets et le dernier itinéraire.
  const loadIncidents = useCallback(async () => {
    try {
      const { data, fromCache } = await networkFirst('signalements', () =>
        api.get('/signalements/').then((r) => r.data.incidents || []),
      )
      setIncidents(data || [])
      setIncidentsFromCache(fromCache)
    } catch {
      // Ni réseau ni cache : la carte reste utilisable sans incidents.
    }
  }, [])

  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  // Rafraîchit quand un signalement en file est synchronisé au retour du réseau,
  // pour qu'il apparaisse sans recharger la page. (La création en ligne repasse
  // par /map, qui recharge de toute façon les incidents au montage.)
  useEffect(() => onPendingChanged(loadIncidents), [loadIncidents])

  // Hors ligne au chargement : on restitue le dernier itinéraire calculé
  // (figé) pour que la carte ne soit pas vide. En ligne, comportement normal
  // le calcul d'itinéraire (ORS/PRIM) reste un appel réseau.
  useEffect(() => {
    if (navigator.onLine) return
    let active = true
    readCache('lastRoute').then((cached) => {
      if (!active || !cached?.route) return
      const r = cached.route
      setRoute(r)
      setFrom(r.from)
      setTo(r.to)
      setFromQuery(r.from?.label || '')
      setToQuery(r.to?.label || '')
      if (cached.profile) setProfile(cached.profile)
      setPhase('result')
      setRouteFromCache(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error')
      setMessage("La géolocalisation n'est pas supportée par ce navigateur.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setStatus('ok')
      },
      (err) => {
        const messages = {
          1: 'Géolocalisation refusée. Carte centrée sur Paris.',
          2: 'Position indisponible. Carte centrée sur Paris.',
          3: 'Délai de localisation dépassé. Carte centrée sur Paris.',
        }
        setStatus('error')
        setMessage(messages[err.code] || 'Erreur de géolocalisation.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  // Avance automatique pendant la navigation : on suit la position en continu
  // et, dès qu'on approche du point de l'étape suivante (< 30 m), on y passe.
  // Version simple : pas de recalcul d'itinéraire, la navigation manuelle
  // (boutons Précédent/Suivant) reste toujours disponible en parallèle.
  useEffect(() => {
    if (!navigating || !('geolocation' in navigator)) return
    const ADVANCE_M = 30
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const here = [pos.coords.latitude, pos.coords.longitude]
        setPosition(here)
        setStepIndex((i) => {
          const next = navSteps[i + 1]
          return next?.point && distanceMeters(here, next.point) < ADVANCE_M
            ? i + 1
            : i
        })
      },
      // Erreurs ignorées : la navigation manuelle prend le relais.
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [navigating, navSteps])

  // Estime l'empreinte du trajet calculé, sans rien enregistrer.
  useEffect(() => {
    const segments = routeToSegments(route, profile)
    if (segments.length === 0) {
      setEstimate(null)
      return
    }

    const controller = new AbortController()
    estimateFootprint(segments, { signal: controller.signal })
      // L'estimation est un complément : si elle échoue, l'itinéraire reste
      // utilisable et aucune erreur n'est affichée.
      .then(setEstimate)
      .catch(() => setEstimate(null))

    return () => controller.abort()
  }, [route, profile])

  /**
   * Calcule l'itinéraire. Le mode est passé explicitement pour que le
   * changement de mode depuis le résultat recalcule avec la bonne valeur,
   * sans dépendre de la propagation du state.
   */
  const calculate = useCallback(
    async (wantedProfile) => {
      if (!from || !to) {
        setError('Choisissez un départ et une arrivée dans les suggestions.')
        return
      }

      setError('')
      setLoading(true)
      setFootprint(null) // un nouveau calcul invalide l'empreinte précédente
      try {
        // L'API attend [longitude, latitude].
        const data = await getDirections(
          [from.lon, from.lat],
          [to.lon, to.lat],
          wantedProfile,
        )
        const computed = { ...data, from, to }
        setRoute(computed)
        setPhase('result')
        setRouteFromCache(false)
        // On garde le dernier itinéraire pour pouvoir le rouvrir hors ligne.
        saveCache('lastRoute', { route: computed, profile: wantedProfile })
      } catch (err) {
        const message = extractError(err, "Impossible de calculer l'itinéraire.")
        if (message) setError(message)
        setRoute(null)
      } finally {
        setLoading(false)
      }
    },
    [from, to],
  )

  // Une fois les adresses du trajet rejoué géocodées, on lance le recalcul,
  // exactement comme un nouveau calcul manuel (l'utilisateur peut ensuite le
  // suivre, navigation pas à pas comprise).
  useEffect(() => {
    if (pendingReplayCalc && from && to && phase === 'search') {
      setPendingReplayCalc(false)
      calculate(profile)
    }
  }, [pendingReplayCalc, from, to, phase, profile, calculate])

  function handleProfileChange(value) {
    // Choix manuel : il prime sur la présélection issue de la préférence.
    userTouchedMode.current = true
    setProfile(value)
    setNavigating(false) // changer de mode sort de la navigation en cours
    // Depuis le résultat, changer de mode relance le calcul sur place.
    if (phase === 'result') calculate(value)
  }

  // Démarre le trajet : enregistre l'empreinte carbone ET entre en navigation
  // pas à pas (les deux, comme demandé).
  async function handleStart() {
    setError('')
    const segments = routeToSegments(route, profile)
    if (segments.length === 0 && navSteps.length === 0) {
      setError("Ce trajet n'a pas de distance exploitable.")
      return
    }

    // Navigation : dès qu'il y a des étapes exploitables.
    if (navSteps.length > 0) {
      setStepIndex(0)
      setNavigating(true)
    }

    // Enregistrement du trajet + empreinte (fonctionnalité conservée).
    if (segments.length > 0) {
      setSaving(true)
      try {
        setFootprint(
          await saveTrajet(segments, {
            depart: from?.label,
            arrivee: to?.label,
            dureeS: Math.round(route?.duration_s || 0),
          }),
        )
        // Sans navigation, on déplie pour rendre la confirmation visible.
        if (navSteps.length === 0) setExpanded(true)
      } catch (err) {
        const message = extractError(err, 'Enregistrement du trajet impossible.')
        if (message) setError(message)
      } finally {
        setSaving(false)
      }
    }
  }

  const goPrevStep = () => setStepIndex((i) => Math.max(0, i - 1))
  const goNextStep = () =>
    setStepIndex((i) => Math.min(navSteps.length - 1, i + 1))

  // Confirme un signalement (+1 vote) : met à jour le compteur affiché.
  async function handleVoteIncident(id) {
    try {
      const { data } = await api.post(`/signalements/${id}/voter/`)
      setIncidents((prev) =>
        prev.map((item) => (item.id === id ? { ...item, votes: data.votes } : item)),
      )
    } catch {
      // Hors ligne ou erreur : on n'altère pas l'affichage.
    }
  }

  // Supprime son propre signalement et le retire de la carte.
  async function handleDeleteIncident(id) {
    try {
      await api.delete(`/signalements/${id}/`)
      setIncidents((prev) => prev.filter((item) => item.id !== id))
    } catch {
      // Erreur (403/hors ligne) : le marqueur reste en place.
    }
  }

  function backToSearch() {
    setPhase('search')
    setExpanded(false)
    setNavigating(false)
    setError('')
    setRouteFromCache(false)
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* zoomControl désactivé : les boutons se logeaient sous la barre de
          recherche flottante. Le zoom reste possible au pinch et à la molette,
          et la maquette n'en montre pas. */}
      <MapContainer
        center={PARIS}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        {/* Tuiles en no-cors (réponse opaque) : chargent dans tout environnement,
            y compris derrière un proxy d'entreprise qui bloquerait le CORS. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Position de l'utilisateur (masquée quand un itinéraire est affiché,
            pour ne pas confondre avec le point A). */}
        {position && !route && (
          <Marker position={position}>
            <Popup>Vous êtes ici</Popup>
          </Marker>
        )}

        {route && (
          <>
            <Polyline
              positions={route.coordinates}
              pathOptions={{ color: ROUTE_COLOR, weight: 5, opacity: 0.85 }}
            />
            <Marker position={[route.from.lat, route.from.lon]} icon={START_ICON}>
              <Popup>Départ : {route.from.label}</Popup>
            </Marker>
            <Marker position={[route.to.lat, route.to.lon]} icon={END_ICON}>
              <Popup>Arrivée : {route.to.label}</Popup>
            </Marker>
            {navigating && currentStep?.point ? (
              // En navigation : pastille sur l'étape en cours + recentrage doux.
              <>
                <Marker position={currentStep.point} icon={STEP_ICON} />
                <FollowStep point={currentStep.point} />
              </>
            ) : (
              <FitRoute
                coordinates={route.coordinates}
                bottomInset={sheetHeight + NAV_HEIGHT + 12}
              />
            )}
          </>
        )}

        {/* Signalements actifs : un marqueur par incident, icône selon le type. */}
        {incidents.map((incident) => {
          const meta = INCIDENT_META[incident.type] || INCIDENT_META.autre
          return (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lon]}
              icon={incidentIcon(incident.type)}
            >
              <Popup>
                <span className="font-semibold text-slate-900">
                  {incident.type_label || meta.label}
                </span>
                {incident.commentaire && (
                  <span className="mt-1 block text-slate-700">
                    {incident.commentaire}
                  </span>
                )}
                <span className="mt-1 block text-slate-500">
                  {formatIncidentDate(incident.date_creation)}
                </span>
                <span className="mt-2 flex items-center gap-2">
                  {/* Confirmation collaborative : +1 vote, compteur en direct. */}
                  <button
                    type="button"
                    onClick={() => handleVoteIncident(incident.id)}
                    className="flex items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2.5 py-1 text-xs font-semibold text-[#1D9E75] transition hover:bg-[#1D9E75]/20"
                  >
                    <ThumbsUp className="size-3.5" aria-hidden="true" />
                    Confirmer ({incident.votes})
                  </button>
                  {/* Suppression réservée à l'auteur du signalement. */}
                  {incident.is_owner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteIncident(incident.id)}
                      className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Supprimer
                    </button>
                  )}
                </span>
              </Popup>
            </Marker>
          )
        })}

        <RecenterMap position={position} disabled={Boolean(route)} />
      </MapContainer>

      {/* Zone 2 : recherche (ou bandeau de navigation), en surimpression. Le
          conteneur laisse passer les clics vers la carte ; seuls les contrôles
          les captent. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-4 pt-12">
        <div className="mx-auto w-full max-w-md">
          {navigating ? (
            <NavigationBanner
              step={currentStep}
              index={stepIndex}
              total={navSteps.length}
              onExit={() => setNavigating(false)}
            />
          ) : (
            <>
              <SearchOverlay
                phase={phase}
                fromQuery={fromQuery}
                setFromQuery={setFromQuery}
                toQuery={toQuery}
                setToQuery={setToQuery}
                from={from}
                setFrom={setFrom}
                to={to}
                setTo={setTo}
                userPosition={position}
                onError={setError}
                onBack={backToSearch}
                onEdit={backToSearch}
              />
              {/* Un seul badge « hors ligne » si l'itinéraire OU les incidents
                  affichés viennent du cache. */}
              {(routeFromCache || incidentsFromCache) && (
                <div className="mt-2 flex justify-center">
                  <OfflineBadge className="pointer-events-auto shadow-sm" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bandeau de statut et bouton de signalement, calés au-dessus du
          panneau quel que soit son cran. */}
      {status !== 'ok' && phase === 'search' && !expanded && !navigating && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[1000] flex justify-center px-4"
          // Au-dessus du panneau (posé sur la nav) et du bouton « Signaler ».
          style={{ bottom: sheetHeight + NAV_HEIGHT + 68 }}
        >
          <p className="rounded-xl bg-white/95 px-4 py-2 text-xs text-slate-600 shadow-lg backdrop-blur">
            {message}
          </p>
        </div>
      )}

      {!navigating && (
        <Link
          to="/signaler"
          className="absolute right-4 z-[1000] flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50"
          style={{ bottom: sheetHeight + NAV_HEIGHT + 12 }}
        >
          <TriangleAlert className="size-4 text-[#1D9E75]" aria-hidden="true" />
          Signaler
        </Link>
      )}

      {navigating ? (
        <NavigationSheet
          steps={navSteps}
          index={stepIndex}
          onPrev={goPrevStep}
          onNext={goNextStep}
          onSelect={setStepIndex}
          onFinish={() => setNavigating(false)}
        />
      ) : (
        <RouteSheet
          phase={phase}
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          height={sheetHeight}
          profiles={profiles}
          profile={profile}
          onProfileChange={handleProfileChange}
          result={route}
          estimate={estimate}
          loading={loading}
          saving={saving}
          error={error}
          footprint={footprint}
          from={from}
          to={to}
          onSubmit={() => calculate(profile)}
          onStart={handleStart}
        />
      )}

      <BottomNav />
    </div>
  )
}
