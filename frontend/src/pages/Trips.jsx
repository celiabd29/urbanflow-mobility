import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Bus, Car, Footprints, Leaf, Loader2, TrainFront, Users } from 'lucide-react'
import api from '@/lib/api'
import { MODE_PRESENTATION, deleteTrajet, formatCo2 } from '@/lib/carbon'
import { MODE_TO_PROFILE, extractError } from '@/lib/routing'
import { networkFirst, saveCache } from '@/lib/offlineStore'
import BottomNav from '@/components/BottomNav'
import OfflineBadge from '@/components/OfflineBadge'
import TripDeleteButton from '@/components/TripDeleteButton'

const MODE_ICONS = {
  bike: Bike,
  walk: Footprints,
  scooter: Bike,
  rail: TrainFront,
  bus: Bus,
  carpool: Users,
  car: Car,
}

/** "2026-07-18T22:43:55Z" -> "18 juil., 22:43" */
function formatDate(value) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Écran en thème clair (maquettes), avec couleurs explicites.
export default function Trips() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Resélection : ouvre la carte pré-remplie avec le départ, l'arrivée et le
  // mode de ce trajet passé. La carte géocode les adresses puis recalcule
  // l'itinéraire (même mécanisme que le paramètre ?mode= des chips d'accueil).
  function replayTrajet(trajet) {
    const params = new URLSearchParams()
    if (trajet.depart) params.set('from', trajet.depart)
    if (trajet.arrivee) params.set('to', trajet.arrivee)
    const mode = trajet.modes_utilises?.[0]?.mode
    const profile = mode && MODE_TO_PROFILE[mode]
    if (profile) params.set('mode', profile)
    navigate(`/map?${params.toString()}`)
  }

  // Supprime un trajet, met à jour la liste et le cache (cohérent avec l'accueil
  // et la consultation hors ligne). L'erreur remonte au bouton pour permettre
  // une nouvelle tentative.
  async function handleDelete(id) {
    setError('')
    try {
      await deleteTrajet(id)
    } catch (err) {
      const message = extractError(err, 'Suppression impossible.')
      if (message) setError(message)
      throw err
    }
    setData((prev) => {
      if (!prev) return prev
      const trajets = prev.trajets.filter((t) => t.id !== id)
      const next = { ...prev, trajets, count: Math.max(0, (prev.count || 1) - 1) }
      saveCache('trips', next)
      return next
    })
  }

  useEffect(() => {
    let active = true
    // Network-first : trajets frais si le réseau répond, sinon le dernier
    // instantané enregistré dans IndexedDB (consultation hors ligne).
    networkFirst('trips', () =>
      api.get('/carbon/historique/').then((r) => r.data),
    )
      .then(({ data: payload, fromCache: cached }) => {
        if (!active) return
        setData(payload)
        setFromCache(cached)
      })
      .catch((err) => {
        if (!active) return
        const message = extractError(err, 'Historique indisponible.')
        if (message) setError(message)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-12">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Mes trajets
          </h1>
          {fromCache && <OfflineBadge className="mt-0.5 shrink-0" />}
        </div>
        {data && (
          <p className="mt-1 text-sm text-slate-500">
            {data.count} trajet{data.count > 1 ? 's' : ''} enregistré
            {data.count > 1 ? 's' : ''}
          </p>
        )}

        {loading && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-slate-500" aria-hidden="true" />
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        {data?.trajets.length === 0 && (
          <p className="mt-6 rounded-2xl border border-slate-100 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Aucun trajet pour l&apos;instant.
            <br />
            Calculez un itinéraire puis démarrez-le : il apparaîtra ici.
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2.5">
          {data?.trajets.map((trajet) => {
            // Le mode dominant donne l'icône : celui qui couvre le plus de km.
            const main = trajet.modes_utilises?.[0]
            const Icon = MODE_ICONS[main?.mode] || Footprints
            const presentation = MODE_PRESENTATION[main?.mode] || {}

            // Rejouable si on connaît au moins le départ et l'arrivée.
            const replayable = Boolean(trajet.depart && trajet.arrivee)

            return (
              <li
                key={trajet.id}
                role={replayable ? 'button' : undefined}
                tabIndex={replayable ? 0 : undefined}
                onClick={replayable ? () => replayTrajet(trajet) : undefined}
                onKeyDown={
                  replayable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          replayTrajet(trajet)
                        }
                      }
                    : undefined
                }
                className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition ${
                  replayable
                    ? 'cursor-pointer hover:border-[#1D9E75]/40 hover:shadow'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${presentation.color || '#64748b'}1a` }}
                    >
                      <Icon
                        className="size-5"
                        style={{ color: presentation.color || '#64748b' }}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {trajet.depart && trajet.arrivee
                          ? `${trajet.depart} → ${trajet.arrivee}`
                          : trajet.modes_utilises
                              .map((entry) => MODE_PRESENTATION[entry.mode]?.label || entry.mode)
                              .join(' + ')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(trajet.date_trajet)} ·{' '}
                        {trajet.distance_km.toFixed(1).replace('.', ',')} km
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2.5 py-1 text-xs font-semibold text-[#0F7B58]">
                      <Leaf className="size-3.5" aria-hidden="true" />
                      {formatCo2(trajet.co2_economise_g)}
                    </span>
                    <TripDeleteButton onConfirm={() => handleDelete(trajet.id)} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <BottomNav />
    </div>
  )
}
