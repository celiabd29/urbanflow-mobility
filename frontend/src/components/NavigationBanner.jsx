import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Bus,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Footprints,
  Navigation,
  RotateCcw,
  RotateCw,
  TrainFront,
  X,
} from 'lucide-react'
import { formatDistance } from '@/lib/routing'

// Codes de manœuvre ORS -> icône de direction.
const TURN_ICONS = {
  0: CornerUpLeft, // à gauche
  1: CornerUpRight, // à droite
  2: ArrowLeft, // franchement à gauche
  3: ArrowRight, // franchement à droite
  4: ArrowUpLeft, // légèrement à gauche
  5: ArrowUpRight, // légèrement à droite
  6: ArrowUp, // tout droit
  7: RotateCw, // entrée rond-point
  8: RotateCw, // sortie rond-point
  9: RotateCcw, // demi-tour
  10: Flag, // arrivée
  11: Navigation, // départ
  12: ArrowUpLeft, // serrez à gauche
  13: ArrowUpRight, // serrez à droite
}

/** Icône adaptée à une étape (manœuvre routière ou section de transport). */
export function stepIcon(step) {
  if (!step) return ArrowUp
  if (step.kind === 'transit') {
    if (step.transitType === 'walking') return Footprints
    if (step.transitType === 'transfer') return RotateCcw
    const mode = (step.mode || '').toLowerCase()
    if (mode.includes('bus')) return Bus
    return TrainFront
  }
  return TURN_ICONS[step.turnType] || ArrowUp
}

/** Libellé de distance mis en avant (ou Départ / Arrivée pour les manœuvres clés). */
function distanceLabel(step) {
  if (step.kind === 'road' && step.turnType === 11) return 'Départ'
  if (step.kind === 'road' && step.turnType === 10) return 'Arrivée'
  if (step.distanceM != null) return formatDistance(step.distanceM)
  return null
}

/**
 * Bandeau haut : instruction de l'étape en cours, bien en évidence, dans le
 * style sombre #0F172A de l'app. Pas de suivi GPS temps réel ici, juste
 * l'affichage clair de l'étape courante.
 */
export default function NavigationBanner({ step, index, total, onExit }) {
  if (!step) return null
  const Icon = stepIcon(step)
  const distance = distanceLabel(step)

  return (
    <div className="pointer-events-auto rounded-2xl bg-[#0F172A] px-4 py-3 text-white shadow-[0_16px_40px_-16px_rgba(15,23,42,0.85)]">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]">
          <Icon className="size-6" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            {distance && (
              <p className="text-lg font-bold leading-none">{distance}</p>
            )}
            <span className="shrink-0 text-[11px] font-medium text-white/50">
              Étape {index + 1} / {total}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug">{step.title}</p>
          {step.detail && (
            <p className="mt-0.5 truncate text-xs text-white/60">{step.detail}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onExit}
          aria-label="Quitter la navigation"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
