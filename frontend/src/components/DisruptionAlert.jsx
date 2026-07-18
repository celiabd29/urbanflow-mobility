import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  DEFAULT_SEVERITY_STYLE,
  MODE_LABELS,
  SEVERITY_STYLES,
  getDisruptions,
} from '@/lib/transport'
import { extractError } from '@/lib/routing'

const MAX_VISIBLE = 3

/**
 * Alerte de perturbations du réseau de transport.
 *
 * Important : les perturbations sont indexées par ligne, alors que nos
 * itinéraires (marche, vélo, voiture) n'en contiennent aucune. On ne peut donc
 * pas affirmer qu'une perturbation touche *ce trajet précis* — l'alerte porte
 * sur les modes de transport déclarés dans le profil de mobilité, et le
 * libellé le dit explicitement pour ne pas induire en erreur.
 */
export default function DisruptionAlert({ modes }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    getDisruptions(modes, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        const message = extractError(err, 'Perturbations indisponibles.')
        if (message) setError(message)
      })

    return () => controller.abort()
  }, [modes])

  if (error) {
    return (
      <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        {error}
      </p>
    )
  }

  if (!data) return null

  const concerned = (data.modes || [])
    .map((mode) => MODE_LABELS[mode] || mode)
    .join(', ')

  if (data.total === 0) {
    return (
      <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        Aucune perturbation en cours{concerned && ` sur : ${concerned}`}.
      </p>
    )
  }

  const visible = expanded ? data.disruptions : data.disruptions.slice(0, MAX_VISIBLE)

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
      <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        {data.total} perturbation{data.total > 1 ? 's' : ''} en cours
        {concerned && (
          <span className="font-normal text-amber-300/80">· {concerned}</span>
        )}
      </p>

      <ul className="mt-2 flex flex-col gap-1.5">
        {visible.map((disruption) => (
          <li
            key={disruption.id}
            className={`rounded-lg border px-2.5 py-1.5 ${
              SEVERITY_STYLES[disruption.severity] || DEFAULT_SEVERITY_STYLE
            }`}
          >
            <p className="text-[11px] font-medium leading-snug">
              {disruption.title}
            </p>
            {disruption.lines?.length > 0 && (
              <p className="mt-0.5 text-[10px] opacity-80">
                {disruption.lines
                  .slice(0, 4)
                  .map((line) => `${line.name} (${line.mode})`)
                  .join(' · ')}
                {disruption.lines.length > 4 && ` +${disruption.lines.length - 4}`}
              </p>
            )}
          </li>
        ))}
      </ul>

      {data.disruptions.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-300 transition hover:opacity-80"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" aria-hidden="true" /> Réduire
            </>
          ) : (
            <>
              <ChevronDown className="size-3" aria-hidden="true" />
              Voir les {data.disruptions.length - MAX_VISIBLE} autres
            </>
          )}
        </button>
      )}
    </div>
  )
}
