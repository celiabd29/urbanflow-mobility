import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bike, Bus, Car, ChevronRight, Footprints, Leaf, MapPin, Search, TrainFront } from 'lucide-react'
import api from '@/lib/api'
import { MODE_PRESENTATION, formatCo2 } from '@/lib/carbon'
import BottomNav from '@/components/BottomNav'
import { formatDuration } from '@/lib/routing'

// Chips de mode : chacune ouvre la carte avec le profil déjà sélectionné,
// plutôt que d'être un simple élément décoratif.
const MODE_CHIPS = [
  { profile: 'cycling-regular', label: 'Vélo', icon: Bike },
  { profile: 'transit', label: 'Transports', icon: TrainFront },
  { profile: 'foot-walking', label: 'Marche', icon: Footprints },
  { profile: 'driving-car', label: 'Voiture', icon: Car },
]

const MODE_ICONS = {
  bike: Bike,
  walk: Footprints,
  scooter: Bike,
  rail: TrainFront,
  bus: Bus,
  car: Car,
}

const RECENT_LIMIT = 3

// Écran en thème clair (maquette écran 3) : couleurs explicites, index.css
// appliquant encore le thème sombre globalement.
export default function Home() {
  const [me, setMe] = useState(null)
  const [trajets, setTrajets] = useState([])
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    api
      .get('/auth/me/', { signal: controller.signal })
      .then(({ data }) => setMe(data))
      .catch(() => {})

    api
      .get('/carbon/historique/', { signal: controller.signal })
      .then(({ data }) => setTrajets(data.trajets.slice(0, RECENT_LIMIT)))
      .catch(() => {})

    api
      .get('/carbon/resume/', { signal: controller.signal })
      .then(({ data }) => setSummary(data))
      .catch(() => {})

    return () => controller.abort()
  }, [])

  // Sans prénom renseigné, on se rabat sur l'identifiant de l'email, avec une
  // majuscule : « jury » afficherait autrement une salutation bâclée.
  const fallback = me?.email?.split('@')[0] || ''
  const firstName =
    me?.first_name || (fallback && fallback[0].toUpperCase() + fallback.slice(1))
  const initials = (me?.first_name?.[0] || me?.email?.[0] || '?').toUpperCase()

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      {/* Bandeau vert foncé : salutation, avatar et recherche */}
      <header className="rounded-b-[2rem] bg-[#0f3d2e] px-6 pb-8 pt-14">
        <div className="mx-auto flex w-full max-w-md items-start justify-between">
          <div>
            <p className="text-sm text-white/70">Bonjour,</p>
            <p className="text-2xl font-bold tracking-tight text-white">
              {firstName || '…'}
            </p>
          </div>
          <Link
            to="/profil"
            aria-label="Mon profil"
            className="flex size-12 items-center justify-center rounded-full bg-[#1D9E75] text-lg font-semibold text-white"
          >
            {initials}
          </Link>
        </div>

        {/* La recherche vit sur la carte : cette barre y conduit. */}
        <Link
          to="/map"
          className="mx-auto mt-5 flex h-14 w-full max-w-md items-center gap-3 rounded-full bg-white px-5 text-sm text-slate-400 shadow-lg"
        >
          <Search className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
          Où allez-vous ?
        </Link>
      </header>

      <div className="mx-auto w-full max-w-md px-5 pb-28">
        {/* Chips de mode */}
        <div className="-mx-1 mt-5 flex gap-2.5 overflow-x-auto px-1 pb-1">
          {MODE_CHIPS.map(({ profile, label, icon: Icon }) => (
            <Link
              key={profile}
              to={`/map?mode=${profile}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300"
            >
              <Icon className="size-4 text-[#1D9E75]" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>

        {/* Trajets récents */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Trajets récents</h2>
            <Link to="/trajets" className="text-sm font-medium text-[#1D9E75]">
              Tout voir
            </Link>
          </div>

          {trajets.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Aucun trajet pour l&apos;instant.
              <br />
              Calculez un itinéraire puis démarrez-le.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {trajets.map((trajet) => {
                const main = trajet.modes_utilises?.[0]
                const Icon = MODE_ICONS[main?.mode] || Footprints
                const presentation = MODE_PRESENTATION[main?.mode] || {}

                return (
                  <li key={trajet.id}>
                    <Link
                      to="/trajets"
                      className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Départ -> arrivée, reliés comme sur la maquette */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center pt-1.5">
                              <span className="size-2.5 rounded-full bg-slate-300" aria-hidden="true" />
                              <span className="my-1 h-5 w-px bg-slate-200" aria-hidden="true" />
                              <MapPin className="size-3.5 text-[#1D9E75]" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {trajet.depart || 'Départ'}
                              </p>
                              <p className="mt-3 truncate text-sm font-semibold text-slate-900">
                                {trajet.arrivee || 'Arrivée'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2.5 py-1 text-xs font-semibold text-[#1D9E75]">
                          <Leaf className="size-3.5" aria-hidden="true" />
                          {formatCo2(trajet.co2_economise_g)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Icon
                            className="size-3.5"
                            style={{ color: presentation.color }}
                            aria-hidden="true"
                          />
                          {presentation.label || main?.mode} ·{' '}
                          {/* Les trajets antérieurs au champ duree_s valent 0 :
                              on retombe alors sur la distance. */}
                          {trajet.duree_s
                            ? formatDuration(trajet.duree_s)
                            : `${trajet.distance_km.toFixed(1).replace('.', ',')} km`}
                        </span>
                        <ChevronRight className="size-4 text-slate-300" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Résumé mensuel : point d'entrée vers l'écran carbone */}
        {summary && (
          <Link
            to="/carbone"
            className="mt-6 flex items-center gap-4 rounded-3xl bg-[#1D9E75] p-5 text-white shadow-[0_18px_38px_-18px_rgba(29,158,117,0.9)] transition hover:bg-[#1a8d68]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Leaf className="size-6" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm text-white/80">
                Ce mois-ci, vous avez économisé
              </span>
              <span className="block text-xl font-bold">
                {formatCo2(summary.co2_economise_g)} de CO₂
              </span>
            </span>
            <ChevronRight className="ml-auto size-5 shrink-0 text-white/70" aria-hidden="true" />
          </Link>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
