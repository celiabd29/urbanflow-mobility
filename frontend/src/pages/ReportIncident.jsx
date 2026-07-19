import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  CarFront,
  CircleAlert,
  Cone,
  Loader2,
  MapPin,
  Wrench,
} from 'lucide-react'
import api from '@/lib/api'
import { extractError } from '@/lib/routing'
import BottomNav from '@/components/BottomNav'

const PARIS = [48.8566, 2.3522]

// Types alignés sur Incident.Type côté Django.
const INCIDENT_TYPES = [
  { value: 'travaux', label: 'Travaux', icon: Cone },
  { value: 'accident', label: 'Accident', icon: CarFront },
  { value: 'panne', label: 'Panne', icon: Wrench },
  { value: 'autre', label: 'Autre', icon: CircleAlert },
]

const MAX_COMMENT = 500

/** Remonte le centre de la carte à chaque déplacement. */
function CenterTracker({ onMove }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      onMove([center.lat, center.lng])
    },
  })
  return null
}

export default function ReportIncident() {
  const navigate = useNavigate()
  const [position, setPosition] = useState(PARIS)
  const [address, setAddress] = useState('')
  const [addressLoading, setAddressLoading] = useState(false)
  const [type, setType] = useState('travaux')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // Centre la carte sur l'utilisateur au premier chargement.
  const located = useRef(false)
  useEffect(() => {
    if (located.current || !('geolocation' in navigator)) return
    located.current = true
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {}, // refus de géolocalisation : on reste sur Paris
      { timeout: 8000 },
    )
  }, [])

  // Adresse du point visé, rafraîchie après chaque déplacement de la carte.
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setAddressLoading(true)
      api
        .get('/routing/geocode/inverse/', {
          params: { lat: position[0], lng: position[1] },
          signal: controller.signal,
        })
        .then(({ data }) => setAddress(data.adresse || ''))
        .catch(() => setAddress('')) // l'adresse est un confort, pas un bloquant
        .finally(() => setAddressLoading(false))
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [position])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/incidents/signaler/', {
        type,
        lat: position[0],
        lon: position[1],
        commentaire: comment,
        adresse: address,
      })
      setDone(true)
      // Laisse le temps de lire la confirmation avant de revenir à la carte.
      setTimeout(() => navigate('/map'), 1500)
    } catch (err) {
      const message = extractError(err, 'Signalement impossible.')
      if (message) setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* Carte de fond : l'utilisateur la déplace pour viser l'incident. */}
      <div className="absolute inset-0">
        <MapContainer
          center={PARIS}
          zoom={16}
          scrollWheelZoom
          zoomControl={false}
          className="size-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CenterTracker onMove={setPosition} />
        </MapContainer>
      </div>

      {/* Épingle fixe au centre : c'est la carte qui bouge, pas l'épingle. */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 z-[1000] -translate-x-1/2 -translate-y-full">
        <span className="flex size-11 items-center justify-center rounded-full rounded-bl-none bg-[#1D9E75] shadow-lg">
          <MapPin className="size-5 rotate-45 text-white" aria-hidden="true" />
        </span>
      </div>

      {/* Barre supérieure */}
      <div className="absolute inset-x-0 top-0 z-[1000] flex items-center gap-3 px-5 pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-md"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <p className="flex h-11 flex-1 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-700 shadow-md">
          Signaler un incident
        </p>
      </div>

      {/* Feuille inférieure */}
      <form
        onSubmit={handleSubmit}
        className="absolute inset-x-0 bottom-0 z-[1000] max-h-[70vh] overflow-y-auto rounded-t-[2rem] bg-white px-6 pb-28 pt-4 shadow-[0_-16px_40px_-20px_rgba(15,23,42,0.4)]"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

        <p className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="size-4 shrink-0 text-[#1D9E75]" aria-hidden="true" />
          {addressLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Recherche de l&apos;adresse…
            </span>
          ) : (
            address || `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
          )}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Déplacez la carte pour ajuster la position.
        </p>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold text-slate-900">
            Type d&apos;incident
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {INCIDENT_TYPES.map(({ value, label, icon: Icon }) => {
              const active = type === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition ${
                    active
                      ? 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-4">
          <label
            htmlFor="incident-comment"
            className="mb-1.5 block text-sm font-semibold text-slate-900"
          >
            Commentaire <span className="font-normal text-slate-400">(optionnel)</span>
          </label>
          <textarea
            id="incident-comment"
            rows={2}
            maxLength={MAX_COMMENT}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Décrivez la situation…"
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1D9E75] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        {done ? (
          <p className="mt-4 flex h-14 items-center justify-center rounded-2xl bg-[#1D9E75]/10 text-sm font-semibold text-[#1D9E75]">
            Signalement enregistré, merci !
          </p>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="mt-4 h-14 w-full rounded-2xl bg-[#1D9E75] text-base font-semibold text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)] transition disabled:opacity-60"
          >
            {saving ? 'Envoi…' : 'Signaler'}
          </button>
        )}
      </form>

      <BottomNav />
    </div>
  )
}
