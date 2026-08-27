'use client'

import {
  Bike,
  Bus,
  Train,
  Leaf,
  Route,
  Bell,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Pencil,
  Home,
  Map,
  Clock,
  User,
} from 'lucide-react'

const stats = [
  { label: 'Trajets réalisés', value: '248', icon: Route },
  { label: 'CO₂ économisé', value: '4,7 kg', icon: Leaf },
]

const preferences = [
  { label: 'Vélo', icon: Bike, active: true },
  { label: 'RER / Train', icon: Train, active: true },
  { label: 'Bus', icon: Bus, active: false },
]

const settings = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'confidentialite', label: 'Confidentialité', icon: ShieldCheck },
]

const navItems = [
  { label: 'Accueil', icon: Home, active: false },
  { label: 'Carte', icon: Map, active: false },
  { label: 'Trajets', icon: Clock, active: false },
  { label: 'Profil', icon: User, active: true },
]

export function ProfileScreen() {
  return (
    <div className="flex h-full flex-col bg-[#f8fafc] text-slate-900">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Green header with avatar */}
        <header className="rounded-b-[2rem] bg-[#0f3d2e] px-5 pb-8 pt-14 text-white shadow-[0_20px_44px_-24px_rgba(15,61,46,0.9)]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="flex size-[68px] items-center justify-center rounded-full bg-[#1D9E75] text-2xl font-semibold text-white ring-4 ring-white/10">
                CL
              </span>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-white text-[#0f3d2e] shadow-md"
                aria-label="Modifier le profil"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Camille Laurent</h1>
              <p className="text-sm text-white/70">camille.laurent@email.com</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1D9E75]/20 px-3 py-1 text-xs font-medium text-[#8ee0be]">
                <Leaf className="size-3.5" aria-hidden="true" />
                Éco-citoyen niveau 4
              </span>
            </div>
          </div>
        </header>

        {/* Stats cards */}
        <section className="px-5 pt-5" aria-label="Statistiques">
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mobility preferences */}
        <section className="px-5 pt-6" aria-label="Préférences de mobilité">
          <h2 className="px-1 text-base font-semibold text-slate-900">Préférences de mobilité</h2>
          <div className="mt-3 flex flex-col gap-1 rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
            {preferences.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-2xl px-3 py-3"
              >
                <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span
                    className={`flex size-9 items-center justify-center rounded-full ${
                      active ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  {label}
                </span>
                <span
                  role="switch"
                  aria-checked={active}
                  aria-label={label}
                  className={`relative h-6 w-11 rounded-full transition ${
                    active ? 'bg-[#1D9E75]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
                      active ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Settings list */}
        <section className="px-5 pt-6" aria-label="Paramètres">
          <h2 className="px-1 text-base font-semibold text-slate-900">Paramètres</h2>
          <div className="mt-3 flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm">
            {settings.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-left last:border-b-0"
              >
                <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  {label}
                </span>
                <ChevronRight className="size-5 text-slate-400" aria-hidden="true" />
              </button>
            ))}
          </div>

          {/* Logout */}
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-4 text-sm font-semibold text-red-600 transition active:scale-[0.99]"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Déconnexion
          </button>
        </section>
      </div>

      {/* Bottom navigation */}
      <nav className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-6 pb-7 pt-3 backdrop-blur">
        <ul className="flex items-center justify-between">
          {navItems.map(({ label, icon: Icon, active }) => (
            <li key={label}>
              <button
                type="button"
                className={`flex flex-col items-center gap-1 text-xs font-medium transition ${
                  active ? 'text-[#1D9E75]' : 'text-slate-400'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
