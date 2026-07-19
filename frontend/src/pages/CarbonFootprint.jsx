import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  Bus,
  Car,
  Leaf,
  Loader2,
  Route as RouteIcon,
  TrainFront,
  TrendingDown,
  Users,
} from 'lucide-react'
import { MODE_PRESENTATION, formatCo2, getMonthlySummary } from '@/lib/carbon'
import { extractError } from '@/lib/routing'
import BottomNav from '@/components/BottomNav'

// Ordre et icônes du graphique de comparaison (maquette écran 5).
const COMPARISON_MODES = [
  { key: 'bike', icon: Bike },
  { key: 'rail', icon: TrainFront },
  { key: 'bus', icon: Bus },
  { key: 'carpool', icon: Users },
  { key: 'car', icon: Car },
]

// Écran en thème clair, conformément à la maquette : les couleurs sont
// explicites car index.css applique le thème sombre globalement.
export default function CarbonFootprint() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    getMonthlySummary({ signal: controller.signal })
      .then(setSummary)
      .catch((err) => {
        const message = extractError(err, 'Bilan carbone indisponible.')
        if (message) setError(message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const factors = summary?.facteurs_emission || {}
  // Le facteur le plus élevé sert d'échelle : les barres restent lisibles
  // même si les valeurs de référence évoluent.
  const maxFactor = Math.max(1, ...Object.values(factors))

  // formatCo2 renvoie « 4,09 kg » ou « 153 g » : on sépare le nombre de son
  // unité pour les composer dans deux tailles différentes.
  const [savedValue, savedUnit] = formatCo2(summary?.co2_economise_g).split(' ')

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-12">
        <header className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Retour à l'accueil"
            className="flex size-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Empreinte carbone
          </h1>
        </header>

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

        {summary && (
          <>
            {/* Carte principale : CO₂ économisé ce mois */}
            <section className="mt-4 rounded-3xl bg-[#0f3d2e] p-6 text-white shadow-[0_20px_44px_-20px_rgba(15,61,46,0.9)]">
              <p className="flex items-center gap-2 text-sm text-white/70">
                <TrendingDown className="size-4 text-[#1D9E75]" aria-hidden="true" />
                CO₂ économisé ce mois
              </p>
              {/* « 4,09 kg CO₂ » : l'unité est détachée pour être affichée en
                  plus petit, comme sur la maquette. */}
              <p className="mt-2 text-4xl font-bold tracking-tight">
                {savedValue}{' '}
                <span className="text-2xl font-semibold text-white/70">
                  {savedUnit} CO₂
                </span>
              </p>

              {summary.evolution_pct !== null && (
                <p className="mt-4 flex w-fit items-center gap-2 rounded-full bg-[#1D9E75]/20 px-3 py-1.5 text-sm font-medium text-[#8ee0be]">
                  <Leaf className="size-4" aria-hidden="true" />
                  {summary.evolution_pct > 0 ? '+' : ''}
                  {summary.evolution_pct}% vs. le mois dernier
                </p>
              )}
              {/* Sans mois précédent, afficher une évolution serait trompeur. */}
              {summary.evolution_pct === null && (
                <p className="mt-4 text-xs text-white/60">
                  Premier mois d&apos;utilisation : pas encore de comparaison.
                </p>
              )}
            </section>

            {/* Comparaison des facteurs d'émission */}
            <section className="mt-7" aria-label="Comparaison des modes de transport">
              <h2 className="text-base font-semibold text-slate-900">
                Émissions par mode
              </h2>
              <div className="mt-3 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                {COMPARISON_MODES.map(({ key, icon: Icon }) => {
                  const factor = factors[key]
                  if (factor === undefined) return null
                  const presentation = MODE_PRESENTATION[key] || {}
                  return (
                    <div key={key}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Icon
                            className="size-4"
                            style={{ color: presentation.color }}
                            aria-hidden="true"
                          />
                          {presentation.label || key}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {factor} g/km
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            // 2 % minimum pour que le vélo reste visible à 0.
                            width: `${Math.max(2, (factor / maxFactor) * 100)}%`,
                            backgroundColor: presentation.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 px-1 text-[11px] text-slate-400">
                Facteurs d&apos;émission ADEME, par personne et par kilomètre.
              </p>
            </section>

            {/* Statistiques du mois */}
            <section className="mt-6 grid grid-cols-2 gap-3">
              <StatCard
                icon={RouteIcon}
                value={summary.trajets}
                label="Trajets ce mois"
              />
              <StatCard
                icon={Leaf}
                value={Math.round(summary.km_eco_mobiles)}
                label="Km éco-mobiles"
              />
            </section>

            {/* Détail des modes réellement utilisés */}
            {summary.par_mode.length > 0 && (
              <section className="mt-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Vos déplacements ce mois
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {summary.par_mode.map((entry) => {
                    const presentation = MODE_PRESENTATION[entry.mode] || {}
                    return (
                      <li
                        key={entry.mode}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: presentation.color }}
                            aria-hidden="true"
                          />
                          {presentation.label || entry.mode}
                        </span>
                        <span className="text-sm text-slate-500">
                          {entry.distance_km.toFixed(1).replace('.', ',')} km ·{' '}
                          <span className="font-semibold text-slate-900">
                            {formatCo2(entry.co2_g)}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {summary.trajets === 0 && (
              <p className="mt-6 rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Aucun trajet enregistré ce mois-ci.
                <br />
                Calculez un itinéraire puis démarrez-le pour suivre votre empreinte.
              </p>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10">
        <Icon className="size-5 text-[#1D9E75]" aria-hidden="true" />
      </span>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
