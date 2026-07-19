import { ChevronDown, ChevronUp, Leaf } from 'lucide-react'
import BikeAvailability from '@/components/BikeAvailability'
import DisruptionAlert from '@/components/DisruptionAlert'
import JourneySteps from '@/components/JourneySteps'
import WeatherBanner from '@/components/WeatherBanner'
import { formatCo2 } from '@/lib/carbon'
import { PROFILE_LABELS, formatDistance, formatDuration } from '@/lib/routing'

// Hauteur de la barre de navigation basse. Le contenu défilant réserve cette
// place plus une marge, sinon la dernière ligne passe dessous.
export const NAV_HEIGHT = 76

/** Sélecteur de mode, partagé par les deux états du panneau. */
function ProfileChips({ profiles, profile, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value)}
          className={
            profile === value
              ? 'rounded-full bg-[#1D9E75] px-3.5 py-2 text-xs font-semibold text-white transition disabled:opacity-60'
              : 'rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:opacity-60'
          }
        >
          {PROFILE_LABELS[value] || value}
        </button>
      ))}
    </div>
  )
}

/**
 * Zone 3 : panneau bas réductible, posé sur la carte.
 *
 * Deux crans seulement, basculés au tap sur la poignée : un drag continu
 * entrerait en conflit avec le défilement interne et le déplacement de la
 * carte, pour un gain limité.
 */
export default function RouteSheet({
  phase,
  expanded,
  onToggle,
  height,
  profiles,
  profile,
  onProfileChange,
  result,
  estimate,
  loading,
  saving,
  error,
  footprint,
  from,
  to,
  onSubmit,
  onStart,
}) {
  const isResult = phase === 'result'

  return (
    <section
      aria-label="Détail de l'itinéraire"
      style={{ height }}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1001] flex flex-col rounded-t-[2rem] bg-white shadow-[0_-16px_40px_-20px_rgba(15,23,42,0.4)] transition-[height] duration-300 ease-out"
    >
      {/* Poignée : toute la zone est cliquable, pour une cible confortable. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Réduire le panneau' : 'Agrandir le panneau'}
        className="flex shrink-0 flex-col items-center gap-1 pb-1 pt-3"
      >
        <span className="h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />
        <span className="text-slate-300" aria-hidden="true">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </span>
      </button>

      <div
        className="flex-1 overflow-y-auto px-6"
        // Sans cette réserve, « Vélos à l'arrivée » finissait sous la barre
        // de navigation, inatteignable au défilement.
        style={{ paddingBottom: NAV_HEIGHT + 16 }}
      >
        {/* --- Bandeau de tête : ce qui reste visible en cran réduit --- */}
        {isResult ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Durée du trajet</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {formatDuration(result?.duration_s)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDistance(result?.distance_m)}
              </p>
            </div>
            {estimate && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1D9E75]/10 px-3 py-1.5 text-sm font-semibold text-[#1D9E75]">
                <Leaf className="size-4" aria-hidden="true" />
                {formatCo2(estimate.co2_economise_g)} CO₂
              </span>
            )}
          </div>
        ) : (
          <ProfileChips
            profiles={profiles}
            profile={profile}
            onChange={onProfileChange}
            disabled={loading}
          />
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        {/* --- Contenu réservé au cran étendu --- */}
        {expanded && !isResult && (
          <div className="mt-4 flex flex-col gap-3">
            {from && <WeatherBanner point={from} profile={profile} />}
            <DisruptionAlert />
          </div>
        )}

        {expanded && isResult && (
          <div className="mt-4 flex flex-col gap-4">
            {/* Changer de mode sans repasser par la saisie : c'est ce qui rend
                le badge CO₂ utile comme comparateur. */}
            <ProfileChips
              profiles={profiles}
              profile={profile}
              onChange={onProfileChange}
              disabled={loading}
            />

            {result?.route_disruptions_known ? (
              <DisruptionAlert
                routeDisruptions={result.journeys?.[0]?.disruptions || []}
                routeTotal={result.journeys?.[0]?.disruptions_total || 0}
                accessibilityTotal={result.journeys?.[0]?.accessibility_total || 0}
              />
            ) : (
              <DisruptionAlert />
            )}

            {result?.journeys?.[0] && <JourneySteps journey={result.journeys[0]} />}

            {profile === 'cycling-regular' && (
              <div className="flex flex-col gap-2">
                <BikeAvailability point={from} label="Vélos au départ" />
                <BikeAvailability point={to} label="Vélos à l'arrivée" />
              </div>
            )}

            {footprint && (
              <div className="rounded-2xl border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-4 py-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-[#1D9E75]">
                  <Leaf className="size-4 shrink-0" aria-hidden="true" />
                  Trajet enregistré
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold">
                    {formatCo2(footprint.co2_economise_g)}
                  </span>{' '}
                  de CO₂ économisés vs voiture
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Action principale, toujours visible au-dessus de la nav --- */}
      <div
        className="shrink-0 border-t border-slate-100 bg-white px-6 pt-3"
        style={{ paddingBottom: NAV_HEIGHT }}
      >
        {isResult ? (
          <button
            type="button"
            onClick={onStart}
            disabled={saving || Boolean(footprint)}
            className="h-14 w-full rounded-2xl bg-[#1D9E75] text-base font-semibold text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {footprint
              ? 'Trajet enregistré'
              : saving
                ? 'Enregistrement…'
                : 'Démarrer le trajet'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-[#1D9E75] text-base font-semibold text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? 'Calcul…' : "Calculer l'itinéraire"}
          </button>
        )}
      </div>
    </section>
  )
}
