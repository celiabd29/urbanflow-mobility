import { useEffect, useState } from 'react'
import { Bike, Bus, Car, Footprints, Leaf, Loader2, TrainFront, Users } from 'lucide-react'
import api from '@/lib/api'
import { MODE_PRESENTATION, formatCo2 } from '@/lib/carbon'
import { extractError } from '@/lib/routing'
import BottomNav from '@/components/BottomNav'

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
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    api
      .get('/carbon/historique/', { signal: controller.signal })
      .then(({ data: payload }) => setData(payload))
      .catch((err) => {
        const message = extractError(err, 'Historique indisponible.')
        if (message) setError(message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-12">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Mes trajets
        </h1>
        {data && (
          <p className="mt-1 text-sm text-slate-500">
            {data.count} trajet{data.count > 1 ? 's' : ''} enregistré
            {data.count > 1 ? 's' : ''}
          </p>
        )}

        {loading && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-slate-400" aria-hidden="true" />
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
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

            return (
              <li
                key={trajet.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
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
                        {trajet.modes_utilises
                          .map((entry) => MODE_PRESENTATION[entry.mode]?.label || entry.mode)
                          .join(' + ')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(trajet.date_trajet)} ·{' '}
                        {trajet.distance_km.toFixed(1).replace('.', ',')} km
                      </p>
                    </div>
                  </div>

                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2.5 py-1 text-xs font-semibold text-[#1D9E75]">
                    <Leaf className="size-3.5" aria-hidden="true" />
                    {formatCo2(trajet.co2_economise_g)}
                  </span>
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
