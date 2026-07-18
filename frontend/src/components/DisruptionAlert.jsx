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
 * Alerte de perturbations, avec deux portées possibles.
 *
 * - Portée « itinéraire » (prop `routeDisruptions`) : réservée aux trajets en
 *   transport en commun. Ces itinéraires contiennent des lignes, donc on sait
 *   réellement quelles perturbations les concernent.
 * - Portée « profil » (par défaut) : pour les trajets ORS (vélo, marche,
 *   voiture), qui ne contiennent aucune ligne. On ne peut alors rien affirmer
 *   sur l'itinéraire lui-même, seulement sur les modes déclarés par
 *   l'utilisateur — et le libellé le dit.
 */
export default function DisruptionAlert({
  routeDisruptions = null,
  routeTotal = 0,
  modes,
}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const routeScope = routeDisruptions !== null

  useEffect(() => {
    // En portée « itinéraire », les données sont déjà fournies : aucun appel.
    if (routeScope) return

    const controller = new AbortController()
    getDisruptions(modes, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        const message = extractError(err, 'Perturbations indisponibles.')
        if (message) setError(message)
      })
    return () => controller.abort()
  }, [routeScope, modes])

  if (routeScope) {
    if (routeTotal === 0) {
      return (
        <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Aucune perturbation signalée sur cet itinéraire.
        </p>
      )
    }
    return (
      <Banner
        title={`${routeTotal} perturbation${routeTotal > 1 ? 's' : ''} sur votre itinéraire`}
        items={routeDisruptions}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
    )
  }

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

  return (
    <Banner
      title={`${data.total} perturbation${data.total > 1 ? 's' : ''} en cours`}
      subtitle={concerned}
      items={data.disruptions}
      expanded={expanded}
      onToggle={() => setExpanded((value) => !value)}
    />
  )
}

/** Présentation commune aux deux portées. */
function Banner({ title, subtitle, items, expanded, onToggle }) {
  const visible = expanded ? items : items.slice(0, MAX_VISIBLE)

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
      <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        {title}
        {subtitle && <span className="font-normal text-amber-300/80">· {subtitle}</span>}
      </p>

      <ul className="mt-2 flex flex-col gap-1.5">
        {visible.map((item, index) => (
          <li
            key={item.id || index}
            className={`rounded-lg border px-2.5 py-1.5 ${
              SEVERITY_STYLES[item.severity?.toUpperCase?.()] || DEFAULT_SEVERITY_STYLE
            }`}
          >
            <p className="text-[11px] font-medium leading-snug">
              {/* Portée itinéraire : Navitia fournit 'message'.
                  Portée profil : PRIM fournit 'title'. */}
              {item.title || item.message}
            </p>
            {item.lines?.length > 0 && (
              <p className="mt-0.5 text-[10px] opacity-80">
                {item.lines
                  .slice(0, 4)
                  .map((line) => `${line.name} (${line.mode})`)
                  .join(' · ')}
                {item.lines.length > 4 && ` +${item.lines.length - 4}`}
              </p>
            )}
          </li>
        ))}
      </ul>

      {items.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-300 transition hover:opacity-80"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" aria-hidden="true" /> Réduire
            </>
          ) : (
            <>
              <ChevronDown className="size-3" aria-hidden="true" />
              Voir les {items.length - MAX_VISIBLE} autres
            </>
          )}
        </button>
      )}
    </div>
  )
}
