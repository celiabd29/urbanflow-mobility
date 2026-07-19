import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import BottomNav from '@/components/BottomNav'
import RouteSheet, { NAV_HEIGHT } from '@/components/RouteSheet'
import SearchOverlay from '@/components/SearchOverlay'
import { estimateFootprint, routeToSegments, saveTrajet } from '@/lib/carbon'
import {
  PROFILE_LABELS,
  extractError,
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

// Hauteur du panneau réduit : poignée, en-tête et bouton d'action, plus la
// barre de navigation qu'il recouvre.
const COLLAPSED_HEIGHT = 252

/**
 * Hauteur du cran étendu.
 *
 * Plafonnée à 62 % : au-delà, il ne restait qu'une bande d'environ 70 px de
 * carte, insuffisante pour cadrer le tracé et ses pastilles A/B — le point de
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

// Recentre sur l'utilisateur — sauf si un itinéraire est affiché,
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
  // Les chips de l'accueil ouvrent la carte avec un mode déjà choisi
  // (/map?mode=cycling-regular).
  const [profile, setProfile] = useState(
    () => searchParams.get('mode') || 'foot-walking',
  )

  // --- Résultat ---
  const [route, setRoute] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [footprint, setFootprint] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // --- Panneau ---
  const [phase, setPhase] = useState('search') // search | result
  const [expanded, setExpanded] = useState(false)
  const [maxHeight, setMaxHeight] = useState(expandedHeight)

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
        setRoute({ ...data, from, to })
        setPhase('result')
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

  function handleProfileChange(value) {
    setProfile(value)
    // Depuis le résultat, changer de mode relance le calcul sur place.
    if (phase === 'result') calculate(value)
  }

  // Enregistre le trajet choisi et affiche son empreinte carbone.
  async function handleStart() {
    setError('')
    const segments = routeToSegments(route, profile)
    if (segments.length === 0) {
      setError("Ce trajet n'a pas de distance exploitable.")
      return
    }

    setSaving(true)
    try {
      setFootprint(
        await saveTrajet(segments, {
          depart: from?.label,
          arrivee: to?.label,
          dureeS: Math.round(route?.duration_s || 0),
        }),
      )
      setExpanded(true) // rend la confirmation visible
    } catch (err) {
      const message = extractError(err, 'Enregistrement du trajet impossible.')
      if (message) setError(message)
    } finally {
      setSaving(false)
    }
  }

  function backToSearch() {
    setPhase('search')
    setExpanded(false)
    setError('')
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
            <FitRoute coordinates={route.coordinates} bottomInset={sheetHeight + 12} />
          </>
        )}

        <RecenterMap position={position} disabled={Boolean(route)} />
      </MapContainer>

      {/* Zone 2 : recherche, en surimpression. Le conteneur laisse passer les
          clics vers la carte ; seuls les contrôles les captent. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-4 pt-12">
        <div className="mx-auto w-full max-w-md">
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
        </div>
      </div>

      {/* Bandeau de statut et bouton de signalement, calés au-dessus du
          panneau quel que soit son cran. */}
      {status !== 'ok' && phase === 'search' && !expanded && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[1000] flex justify-center px-4"
          // Décalé au-dessus du bouton « Signaler », qui occupe la même bande.
          style={{ bottom: sheetHeight + 68 }}
        >
          <p className="rounded-xl bg-white/95 px-4 py-2 text-xs text-slate-600 shadow-lg backdrop-blur">
            {message}
          </p>
        </div>
      )}

      <Link
        to="/signaler"
        className="absolute right-4 z-[1000] flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50"
        style={{ bottom: sheetHeight + 12 }}
      >
        <TriangleAlert className="size-4 text-[#1D9E75]" aria-hidden="true" />
        Signaler
      </Link>

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

      <BottomNav />
    </div>
  )
}
