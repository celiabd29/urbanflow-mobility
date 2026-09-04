import { Bus, Footprints, TrainFront } from 'lucide-react'
import { formatDuration } from '@/lib/routing'

// Icône selon le mode physique Navitia (RER, Metro, Bus, Tramway…).
function modeIcon(section) {
  const mode = (section.mode || '').toLowerCase()
  if (mode.includes('bus')) return Bus
  return TrainFront
}

/**
 * Choix parmi les itinéraires en transport en commun proposés par PRIM.
 *
 * Plusieurs chemins mènent souvent au même endroit (bus, tram, RER, métro,
 * combinaisons). On les présente tous, chacun résumé par ses lignes et sa
 * durée, pour que l'utilisateur choisisse plutôt que de subir le premier.
 */
export default function JourneyOptions({ journeys, selected, onSelect }) {
  // Un seul itinéraire : rien à choisir, le détail suffit.
  if (!journeys || journeys.length <= 1) return null

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">
        {journeys.length} itinéraires possibles
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {journeys.map((journey, index) => {
          const lines = (journey.sections || []).filter(
            (section) => section.type === 'public_transport',
          )
          const transfers = journey.nb_transfers || 0
          const active = index === selected

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              aria-pressed={active}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                active
                  ? 'border-[#1D9E75] bg-[#1D9E75]/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="min-w-0">
                {/* Enchaînement des lignes empruntées, aux couleurs officielles. */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {lines.length === 0 ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                      <Footprints className="size-3.5" aria-hidden="true" />
                      Marche
                    </span>
                  ) : (
                    lines.map((section, i) => {
                      const Icon = modeIcon(section)
                      return (
                        <span
                          key={i}
                          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                          style={
                            section.line_color
                              ? {
                                  backgroundColor: `${section.line_color}22`,
                                  color: section.line_color,
                                }
                              : { backgroundColor: '#0F7B5815', color: '#0F7B58' }
                          }
                        >
                          <Icon className="size-3 shrink-0" aria-hidden="true" />
                          {section.line || section.mode}
                        </span>
                      )
                    })
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {transfers === 0
                    ? 'Direct'
                    : `${transfers} correspondance${transfers > 1 ? 's' : ''}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-bold ${
                  active ? 'text-[#0F7B58]' : 'text-slate-900'
                }`}
              >
                {formatDuration(journey.duration_s)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
