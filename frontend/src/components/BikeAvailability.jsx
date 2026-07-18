import { useEffect, useState } from 'react'
import { Bike, Loader2, Zap } from 'lucide-react'
import { getBikeAvailability, summariseStations } from '@/lib/transport'
import { extractError } from '@/lib/routing'

/**
 * Disponibilité des vélos en libre-service autour d'un point de l'itinéraire.
 * Affiché sur les segments concernés (départ et arrivée d'un trajet à vélo).
 */
export default function BikeAvailability({ point, label }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!point) {
      setData(null)
      return
    }

    // Annule la requête si le point change avant la réponse.
    const controller = new AbortController()
    setLoading(true)
    setError('')

    getBikeAvailability(point.lat, point.lon, 500, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        const message = extractError(err, 'Disponibilité indisponible.')
        // extractError renvoie null sur une annulation volontaire.
        if (message) setError(message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [point])

  if (!point) return null

  const totals = data ? summariseStations(data.stations) : null

  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Bike className="size-3.5 text-primary" aria-hidden="true" />
          {label}
        </span>
        {loading && (
          <Loader2
            className="size-3.5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Une panne de l'API ne casse pas le planificateur : on le signale
          discrètement et le reste de l'écran continue de fonctionner. */}
      {error && <p className="mt-1 text-xs text-muted-foreground">{error}</p>}

      {!error && totals && (
        <>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-foreground">
              {totals.bikes}
            </span>
            <span className="text-xs text-muted-foreground">
              {totals.bikes > 1 ? 'vélos disponibles' : 'vélo disponible'}
              {data.count > 0 && ` · ${data.count} station${data.count > 1 ? 's' : ''}`}
            </span>
          </p>

          {totals.bikes > 0 && (
            <p className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{totals.mechanical} mécaniques</span>
              <span className="flex items-center gap-1">
                <Zap className="size-3" aria-hidden="true" />
                {totals.electric} électriques
              </span>
              <span>{totals.docks} bornes libres</span>
            </p>
          )}

          {data.count === 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Aucune station dans un rayon de 500 m.
            </p>
          )}
        </>
      )}
    </div>
  )
}
