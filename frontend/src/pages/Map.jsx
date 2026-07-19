import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import RoutePlanner from '@/components/RoutePlanner'
import BottomNav from '@/components/BottomNav'

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

// Cadre la carte sur l'ensemble du tracé.
function FitRoute({ coordinates }) {
  const map = useMap()
  useEffect(() => {
    if (coordinates?.length) {
      map.fitBounds(coordinates, { padding: [60, 60] })
    }
  }, [coordinates, map])
  return null
}

export default function MapPage() {
  const [position, setPosition] = useState(null)
  const [status, setStatus] = useState('locating') // locating | ok | error
  const [message, setMessage] = useState('Localisation en cours…')
  const [route, setRoute] = useState(null)

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

  return (
    <div className="relative h-screen w-full">
      <MapContainer center={PARIS} zoom={13} scrollWheelZoom className="h-full w-full">
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

        {/* Tracé + extrémités de l'itinéraire */}
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
            <FitRoute coordinates={route.coordinates} />
          </>
        )}

        <RecenterMap position={position} disabled={Boolean(route)} />
      </MapContainer>

      {/* Panneau du planificateur, superposé à la carte */}
      <div className="absolute left-4 top-4 z-[1000] w-[min(22rem,calc(100%-2rem))]">
        <RoutePlanner userPosition={position} onRouteChange={setRoute} />
      </div>

      {/* Bandeau de statut, remonté pour ne pas passer sous la barre de navigation */}
      {status !== 'ok' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[1000] flex justify-center px-4">
          <p className="rounded-xl border border-border bg-card/95 px-4 py-2 text-sm text-foreground shadow-lg">
            {message}
          </p>
        </div>
      )}

      {/* Accès au signalement d'incident (FC2), au-dessus de la barre de nav. */}
      <Link
        to="/signaler"
        className="absolute bottom-24 right-4 z-[1000] flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50"
      >
        <TriangleAlert className="size-4 text-[#1D9E75]" aria-hidden="true" />
        Signaler
      </Link>

      <BottomNav />
    </div>
  )
}
