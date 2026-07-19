import { useEffect, useState } from 'react'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  Loader2,
  Snowflake,
  Sun,
  Wind,
} from 'lucide-react'
import {
  CONDITION_LABELS,
  formatSlotHour,
  getWeather,
  hasPrecipitation,
} from '@/lib/weather'
import { extractError } from '@/lib/routing'

const CONDITION_ICONS = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  drizzle: CloudDrizzle,
  thunderstorm: CloudLightning,
  snow: Snowflake,
  fog: CloudFog,
}

// Au-delà, le vent devient un facteur réel pour un cycliste (~36 km/h).
const STRONG_WIND_MS = 10

/**
 * Météo au point de départ, avec un avertissement quand les conditions
 * peuvent peser sur le choix du mode.
 *
 * L'avertissement informe sans jamais bloquer : l'utilisateur reste libre de
 * partir à vélo sous la pluie.
 */
export default function WeatherBanner({ point, profile }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!point) {
      setReport(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    getWeather(point.lat, point.lon, { signal: controller.signal })
      .then(setReport)
      .catch((err) => {
        const message = extractError(err, 'Météo indisponible.')
        if (message) setError(message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [point])

  if (!point) return null

  // Une météo absente ne doit pas encombrer l'écran : on reste discret.
  if (error) {
    return (
      <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
        {error}
      </p>
    )
  }

  if (loading && !report) {
    return (
      <p className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Météo au départ…
      </p>
    )
  }

  if (!report) return null

  const { current, upcoming_precipitation: upcoming } = report
  const Icon = CONDITION_ICONS[current.condition] || Cloud
  const description = current.description || CONDITION_LABELS[current.condition] || ''
  const windy = current.wind_speed_ms >= STRONG_WIND_MS

  // L'avertissement ne concerne que les modes exposés aux intempéries.
  const exposedProfile = profile === 'cycling-regular' || profile === 'foot-walking'
  const warn = exposedProfile && (hasPrecipitation(report) || windy)

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="capitalize text-foreground">{description}</span>
        <span>· {Math.round(current.temperature_c)} °C</span>
        {windy && (
          <span className="flex items-center gap-1">
            · <Wind className="size-3.5" aria-hidden="true" />
            {Math.round(current.wind_speed_ms * 3.6)} km/h
          </span>
        )}
      </p>

      {warn && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <CloudRain className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {upcoming && !current.is_precipitation
              ? `${CONDITION_LABELS[upcoming.condition] || 'Précipitations'} prévue${
                  formatSlotHour(upcoming.expected_at)
                    ? ` vers ${formatSlotHour(upcoming.expected_at)}`
                    : ''
                } sur ce trajet.`
              : current.is_precipitation
                ? `${description} en cours sur ce trajet.`
                : 'Vent soutenu sur ce trajet.'}
          </span>
        </p>
      )}
    </div>
  )
}
