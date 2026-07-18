import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Bus, Car, Footprints, TrainFront } from 'lucide-react'
import api from '@/lib/api'

// Identifiants alignés sur TRANSPORT_MODES côté Django (users/models.py).
const MODES = [
  { value: 'bike', label: 'Vélo', icon: Bike },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'rail', label: 'RER / Train / Métro', icon: TrainFront },
  { value: 'car', label: 'Voiture', icon: Car },
  { value: 'walk', label: 'Marche', icon: Footprints },
]

// Aligné sur USAGE_FREQUENCIES côté Django.
const FREQUENCIES = [
  { value: 'daily', label: 'Tous les jours' },
  { value: 'weekly', label: 'Plusieurs fois par semaine' },
  { value: 'occasional', label: 'De temps en temps' },
  { value: 'rare', label: 'Rarement' },
]

// Écran en thème clair (maquette v0) : les couleurs sont explicites car
// index.css applique le thème sombre globalement.
export default function MobilityProfile() {
  const navigate = useNavigate()
  const [modes, setModes] = useState([])
  const [frequency, setFrequency] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleMode(value) {
    // Toute correction efface le message d'erreur : le garder affiché alors
    // que l'utilisateur vient de corriger serait trompeur.
    setError('')
    setModes((current) =>
      current.includes(value)
        ? current.filter((mode) => mode !== value)
        : [...current, value],
    )
  }

  function handleFrequencyChange(event) {
    setError('')
    setFrequency(event.target.value)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Mêmes règles que la validation serveur, pour un retour immédiat.
    if (modes.length === 0) {
      setError('Sélectionnez au moins un mode de transport.')
      return
    }
    if (!frequency) {
      setError("Indiquez votre fréquence d'usage.")
      return
    }

    setLoading(true)
    try {
      await api.patch('/auth/me/', {
        transport_preferences: { modes, frequency },
      })
      navigate('/')
    } catch (err) {
      const detail = err.response?.data
      // DRF renvoie soit { detail }, soit { transport_preferences: {...} }.
      const message =
        detail?.detail ||
        JSON.stringify(detail?.transport_preferences || '') ||
        'Enregistrement impossible.'
      setError(typeof message === 'string' ? message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-16">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Configurer mon profil de mobilité
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Indiquez comment vous vous déplacez : UrbanFlow adaptera vos
            itinéraires en conséquence.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col">
          {/* Modes de transport — sélection multiple */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">
              Modes de transport préférés
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Plusieurs choix possibles.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {MODES.map(({ value, label, icon: Icon }) => {
                const selected = modes.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleMode(value)}
                    aria-pressed={selected}
                    className={[
                      'flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition',
                      selected
                        ? 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                    ].join(' ')}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Fréquence d'usage */}
          <div className="mt-8 flex flex-col gap-2">
            <label
              htmlFor="frequency"
              className="text-sm font-semibold text-slate-900"
            >
              Fréquence d&apos;usage
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={handleFrequencyChange}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/30"
            >
              <option value="" disabled>
                Choisissez une fréquence
              </option>
              {FREQUENCIES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Le bouton reste en bas de l'écran */}
          <div className="mt-auto pt-10">
            <button
              type="submit"
              disabled={loading}
              className="h-13 w-full rounded-2xl bg-[#1D9E75] text-base font-semibold text-white shadow-[0_12px_28px_-10px_rgba(29,158,117,0.8)] transition hover:bg-[#1D9E75]/90 disabled:opacity-60"
            >
              {loading ? 'Enregistrement…' : 'Continuer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
