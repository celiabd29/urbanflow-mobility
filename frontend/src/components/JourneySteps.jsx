import { AlertTriangle, Bus, Footprints, TrainFront, Repeat } from 'lucide-react'
import { formatDuration } from '@/lib/routing'

// Icône par mode physique renvoyé par Navitia (RER, Metro, Bus, Tramway…).
function sectionIcon(section) {
  if (section.type === 'walking') return Footprints
  if (section.type === 'transfer') return Repeat
  const mode = (section.mode || '').toLowerCase()
  if (mode.includes('bus')) return Bus
  return TrainFront
}

function sectionTitle(section) {
  if (section.type === 'walking') return 'Marche'
  if (section.type === 'transfer') return 'Correspondance'
  if (section.type === 'waiting') return 'Attente'
  return `${section.mode || 'Transport'} ${section.line || ''}`.trim()
}

function sectionDetail(section) {
  if (section.type === 'public_transport') {
    const direction = section.direction ? ` · dir. ${section.direction}` : ''
    return `${section.from} → ${section.to}${direction}`
  }
  if (section.to) return `Jusqu'à ${section.to}`
  return null
}

/**
 * Étapes détaillées d'un trajet en transport en commun, dans l'esprit de
 * l'écran 4 des maquettes : une ligne par section, reliées verticalement.
 */
export default function JourneySteps({ journey }) {
  if (!journey?.sections?.length) return null

  // Les sections très courtes (quelques secondes d'attente) n'apportent rien.
  const sections = journey.sections.filter(
    (section) => section.duration_s >= 30 || section.type === 'public_transport',
  )

  return (
    <ol className="mt-3 flex flex-col" aria-label="Étapes du trajet">
      {sections.map((section, index) => {
        const Icon = sectionIcon(section)
        const detail = sectionDetail(section)
        const isLast = index === sections.length - 1

        return (
          <li key={`${section.type}-${index}`} className="flex gap-3">
            {/* Colonne icône + trait de liaison */}
            <div className="flex flex-col items-center">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={
                  section.line_color
                    ? { backgroundColor: `${section.line_color}22`, color: section.line_color }
                    : undefined
                }
              >
                <Icon
                  className={`size-4 ${section.line_color ? '' : 'text-primary'}`}
                  aria-hidden="true"
                />
              </span>
              {!isLast && <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>

            <div className="flex flex-1 items-start justify-between gap-2 pb-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {sectionTitle(section)}
                </p>
                {detail && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {detail}
                  </p>
                )}
                {section.disruptions_total > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-300">
                    <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                    {section.disruptions[0]?.message || 'Perturbation en cours'}
                    {section.disruptions_total > 1 &&
                      ` (+${section.disruptions_total - 1})`}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {formatDuration(section.duration_s)}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
