import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { stepIcon } from '@/components/NavigationBanner'
import { NAV_HEIGHT } from '@/components/RouteSheet'
import { formatDistance, formatDuration } from '@/lib/routing'

/**
 * Panneau bas de navigation : liste complète des étapes, l'étape en cours mise
 * en avant, et navigation manuelle (Précédent / Suivant). Posé au-dessus de la
 * barre de navigation comme la fiche d'itinéraire.
 */
export default function NavigationSheet({
  steps,
  index,
  onPrev,
  onNext,
  onSelect,
  onFinish,
}) {
  const activeRef = useRef(null)
  const isLast = index >= steps.length - 1

  // Garde l'étape courante visible quand elle change (auto-avance ou boutons).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [index])

  return (
    <section
      aria-label="Navigation pas à pas"
      style={{ bottom: NAV_HEIGHT }}
      className="pointer-events-auto fixed inset-x-0 z-[1001] flex max-h-[46vh] flex-col rounded-t-[2rem] bg-white shadow-[0_-16px_40px_-20px_rgba(15,23,42,0.4)]"
    >
      <div className="shrink-0 px-6 pb-1 pt-4">
        <p className="text-sm font-semibold text-slate-900">Navigation</p>
        <p className="text-xs text-slate-500">
          Étape {index + 1} sur {steps.length}
        </p>
      </div>

      <ol className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {steps.map((step, i) => {
          const Icon = stepIcon(step)
          const active = i === index
          const meta =
            step.detail ||
            [
              step.distanceM != null ? formatDistance(step.distanceM) : null,
              step.durationS ? formatDuration(step.durationS) : null,
            ]
              .filter(Boolean)
              .join(' · ')

          return (
            <li key={i} ref={active ? activeRef : null}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={
                  active
                    ? 'flex w-full items-center gap-3 rounded-2xl bg-[#1D9E75]/10 px-3 py-2.5 text-left ring-1 ring-[#1D9E75]/40'
                    : 'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50'
                }
              >
                <span
                  className={
                    active
                      ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-white'
                      : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500'
                  }
                  style={
                    !active && step.lineColor
                      ? { backgroundColor: `${step.lineColor}22`, color: step.lineColor }
                      : undefined
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      active
                        ? 'block truncate text-sm font-semibold text-slate-900'
                        : 'block truncate text-sm font-medium text-slate-700'
                    }
                  >
                    {step.title}
                  </span>
                  {meta && (
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {meta}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="flex shrink-0 gap-2 rounded-b-[2rem] border-t border-slate-100 bg-white px-6 pb-4 pt-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 transition active:scale-[0.99] disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Précédent
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onFinish}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#1D9E75] text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(29,158,117,0.9)] transition active:scale-[0.99]"
          >
            <Flag className="size-4" aria-hidden="true" />
            Terminer
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-[#1D9E75] text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(29,158,117,0.9)] transition active:scale-[0.99]"
          >
            Suivant
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}
