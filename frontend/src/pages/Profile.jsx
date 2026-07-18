import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Bus, Car, Footprints, Leaf, LogOut, Route as RouteIcon, TrainFront } from 'lucide-react'
import api, { tokenStore } from '@/lib/api'
import { formatCo2 } from '@/lib/carbon'
import { extractError } from '@/lib/routing'
import BottomNav from '@/components/BottomNav'

// Mêmes identifiants que TRANSPORT_MODES côté Django.
const MODES = [
  { value: 'bike', label: 'Vélo', icon: Bike },
  { value: 'rail', label: 'RER / Train / Métro', icon: TrainFront },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'car', label: 'Voiture', icon: Car },
  { value: 'walk', label: 'Marche', icon: Footprints },
]

export default function Profile() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [stats, setStats] = useState({ trajets: 0, co2: 0 })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    api
      .get('/auth/me/', { signal: controller.signal })
      .then(({ data }) => setMe(data))
      .catch((err) => {
        const message = extractError(err, 'Profil indisponible.')
        if (message) setError(message)
      })

    // Deux sources : le total exact de trajets vient de l'historique,
    // le CO₂ du bilan mensuel. On n'invente pas de total sur la vie entière.
    Promise.all([
      api.get('/carbon/historique/', { signal: controller.signal }),
      api.get('/carbon/resume/', { signal: controller.signal }),
    ])
      .then(([historique, resume]) =>
        setStats({
          trajets: historique.data.count,
          co2: resume.data.co2_economise_g,
        }),
      )
      .catch(() => {}) // statistiques absentes : l'écran reste utilisable

    return () => controller.abort()
  }, [])

  const modes = me?.transport_preferences?.modes || []

  async function toggleMode(value) {
    const next = modes.includes(value)
      ? modes.filter((mode) => mode !== value)
      : [...modes, value]

    // Le serveur refuse une liste vide : on évite un aller-retour perdant.
    if (next.length === 0) {
      setError('Gardez au moins un mode de transport.')
      return
    }

    setError('')
    setSaving(true)
    const previous = me
    // Mise à jour optimiste : l'interrupteur réagit immédiatement.
    setMe({ ...me, transport_preferences: { ...me.transport_preferences, modes: next } })

    try {
      const { data } = await api.patch('/auth/me/', {
        transport_preferences: { ...me.transport_preferences, modes: next },
      })
      setMe(data)
    } catch (err) {
      setMe(previous) // on rétablit l'état précédent en cas d'échec
      const message = extractError(err, 'Enregistrement impossible.')
      if (message) setError(message)
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    tokenStore.clear()
    navigate('/login')
  }

  const initials = (me?.first_name?.[0] || me?.email?.[0] || '?').toUpperCase()

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-12">
        {/* En-tête */}
        <header className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-[#1D9E75] text-xl font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900">
              {me?.first_name || 'Mon profil'}
            </p>
            <p className="truncate text-sm text-slate-500">{me?.email}</p>
          </div>
        </header>

        {/* Statistiques */}
        <section className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10">
              <RouteIcon className="size-5 text-[#1D9E75]" aria-hidden="true" />
            </span>
            <p className="mt-3 text-2xl font-bold text-slate-900">{stats.trajets}</p>
            <p className="text-xs text-slate-500">Trajets réalisés</p>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10">
              <Leaf className="size-5 text-[#1D9E75]" aria-hidden="true" />
            </span>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {formatCo2(stats.co2)}
            </p>
            <p className="text-xs text-slate-500">CO₂ économisé ce mois</p>
          </div>
        </section>

        {/* Préférences de mobilité */}
        <section className="mt-7">
          <h2 className="text-base font-semibold text-slate-900">
            Préférences de mobilité
          </h2>
          <div className="mt-3 flex flex-col divide-y divide-slate-100 rounded-3xl border border-slate-100 bg-white shadow-sm">
            {MODES.map(({ value, label, icon: Icon }) => {
              const active = modes.includes(value)
              return (
                <div key={value} className="flex items-center justify-between px-5 py-4">
                  <span className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10">
                      <Icon className="size-5 text-[#1D9E75]" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-slate-800">{label}</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={label}
                    disabled={saving}
                    onClick={() => toggleMode(value)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                      active ? 'bg-[#1D9E75]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${
                        active ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
          <p className="mt-2 px-1 text-[11px] text-slate-400">
            Ces modes déterminent les perturbations qui vous sont signalées.
          </p>
        </section>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-7 flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Déconnexion
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
