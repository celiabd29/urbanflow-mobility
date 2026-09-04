import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Bike,
  Bus,
  Car,
  ChevronRight,
  Footprints,
  Leaf,
  LogOut,
  Route as RouteIcon,
  ShieldCheck,
  TrainFront,
} from 'lucide-react'
import api, { tokenStore } from '@/lib/api'
import { formatCo2 } from '@/lib/carbon'
import { extractError } from '@/lib/routing'
import { isGeolocationEnabled, setGeolocationEnabled } from '@/lib/privacy'
import {
  disableNotifications,
  enableNotifications,
  notificationsPreferred,
  supportsNotifications,
} from '@/lib/notifications'
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
  // Réglage de confidentialité : autorisation de la géolocalisation (appareil).
  const [geoEnabled, setGeoEnabled] = useState(isGeolocationEnabled)
  // Notifications de perturbations : préférence par appareil, désactivées par
  // défaut (elles réclament la permission du navigateur).
  const [notifsEnabled, setNotifsEnabled] = useState(notificationsPreferred)
  const [notifHint, setNotifHint] = useState('')

  function toggleGeolocation() {
    const next = !geoEnabled
    setGeolocationEnabled(next)
    setGeoEnabled(next)
  }

  async function toggleNotifications() {
    setNotifHint('')
    if (notifsEnabled) {
      disableNotifications()
      setNotifsEnabled(false)
      return
    }
    if (!supportsNotifications()) {
      setNotifHint("Votre navigateur ne prend pas en charge les notifications.")
      return
    }
    // Demande la permission au navigateur : on ne l'active que si elle est accordée.
    const permission = await enableNotifications()
    if (permission === 'granted') {
      setNotifsEnabled(true)
    } else if (permission === 'denied') {
      setNotifHint(
        'Notifications bloquées par le navigateur. Autorisez-les dans ses réglages pour ce site.',
      )
    }
  }

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
      {/* En-tête vert, comme sur la maquette écran 7 */}
      <header className="rounded-b-[2rem] bg-[#0f3d2e] px-5 pb-8 pt-14 text-white shadow-[0_20px_44px_-24px_rgba(15,61,46,0.9)]">
        <div className="mx-auto flex w-full max-w-md items-center gap-4">
          <span className="flex size-[68px] shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-2xl font-semibold text-white ring-4 ring-white/10">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {me?.first_name || 'Mon profil'}
            </h1>
            <p className="truncate text-sm text-white/70">{me?.email}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-col px-5 pb-28">
        {/* Statistiques */}
        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10">
              <RouteIcon className="size-5 text-[#0F7B58]" aria-hidden="true" />
            </span>
            <p className="mt-3 text-2xl font-bold text-slate-900">{stats.trajets}</p>
            <p className="text-xs text-slate-500">Trajets réalisés</p>
          </div>
          {/* Le détail de ce chiffre vit sur l'écran carbone : la carte y mène. */}
          <Link
            to="/carbone"
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-slate-200"
          >
            <span className="flex items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10">
                <Leaf className="size-5 text-[#0F7B58]" aria-hidden="true" />
              </span>
              <ChevronRight className="size-4 text-slate-300" aria-hidden="true" />
            </span>
            <span className="mt-3 block text-2xl font-bold text-slate-900">
              {formatCo2(stats.co2)}
            </span>
            <span className="block text-xs text-slate-500">CO₂ économisé ce mois</span>
          </Link>
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
                      <Icon className="size-5 text-[#0F7B58]" aria-hidden="true" />
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
          <p className="mt-2 px-1 text-[11px] text-slate-500">
            Ces modes déterminent les perturbations qui vous sont signalées.
          </p>
        </section>

        {/* Accès au tableau de bord d'administration, réservé aux comptes staff. */}
        {me?.is_staff && (
          <Link
            to="/administration"
            className="mt-6 flex items-center gap-4 rounded-3xl border border-[#0F7B58]/20 bg-white p-4 shadow-sm transition hover:border-[#0F7B58]/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#0F7B58]/10">
              <ShieldCheck className="size-5 text-[#0F7B58]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">
                Administration
              </span>
              <span className="block text-xs text-slate-500">
                Gérer les comptes et consulter les statistiques
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-500" aria-hidden="true" />
          </Link>
        )}

        {/* Paramètres réels : notifications et confidentialité. */}
        <section className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">Paramètres</h2>
          <div className="mt-3 flex flex-col divide-y divide-slate-100 rounded-3xl border border-slate-100 bg-white shadow-sm">
            {/* Notifications de perturbations sur les lignes de l'utilisateur. */}
            <div className="flex items-center justify-between px-4 py-4">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0F7B58]/10">
                  <Bell className="size-4 text-[#0F7B58]" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    Notifications
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    M&apos;alerter des perturbations sur mes lignes
                  </span>
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notifsEnabled}
                aria-label="Activer les notifications"
                onClick={toggleNotifications}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  notifsEnabled ? 'bg-[#1D9E75]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${
                    notifsEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Confidentialité : autorisation de la géolocalisation (réel). */}
            <div className="flex items-center justify-between px-4 py-4">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0F7B58]/10">
                  <ShieldCheck className="size-4 text-[#0F7B58]" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    Géolocalisation
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Autoriser l&apos;app à utiliser ma position
                  </span>
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={geoEnabled}
                aria-label="Autoriser la géolocalisation"
                onClick={toggleGeolocation}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  geoEnabled ? 'bg-[#1D9E75]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${
                    geoEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="mt-2 px-1 text-[11px] text-slate-500">
            Désactivée, l&apos;app ne demande pas votre position : la carte reste
            centrée sur Paris.
          </p>
          {notifHint && (
            <p className="mt-2 px-1 text-[11px] text-amber-600">{notifHint}</p>
          )}
        </section>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-7 flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Déconnexion
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
