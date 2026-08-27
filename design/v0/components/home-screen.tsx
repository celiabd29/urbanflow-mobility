'use client'

import {
  Bike,
  Bus,
  Footprints,
  Users,
  Search,
  Leaf,
  MapPin,
  ArrowRight,
  Home,
  Map,
  Clock,
  User,
} from 'lucide-react'

const transportModes = [
  { label: 'Vélo', icon: Bike },
  { label: 'Bus', icon: Bus },
  { label: 'Marche', icon: Footprints },
  { label: 'Covoiturage', icon: Users },
]

const recentTrips = [
  {
    from: 'Domicile',
    to: 'Bureau — La Défense',
    mode: 'Vélo · 24 min',
    co2: '1,2 kg',
  },
  {
    from: 'Gare Montparnasse',
    to: 'Parc Montsouris',
    mode: 'Bus · 18 min',
    co2: '0,8 kg',
  },
  {
    from: 'Bureau',
    to: 'Salle de sport',
    mode: 'Marche · 12 min',
    co2: '0,4 kg',
  },
]

const navItems = [
  { label: 'Accueil', icon: Home, active: true },
  { label: 'Carte', icon: Map, active: false },
  { label: 'Trajets', icon: Clock, active: false },
  { label: 'Profil', icon: User, active: false },
]

export function HomeScreen() {
  return (
    <div className="flex h-full flex-col bg-[#f8fafc] text-slate-900">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <header className="rounded-b-[2rem] bg-[#0f3d2e] px-6 pb-6 pt-16 text-white">
          <div className="mt-2 flex items-start justify-between">
            <div>
              <p className="text-sm text-white/70">Bonjour,</p>
              <h1 className="text-2xl font-semibold tracking-tight">Camille</h1>
            </div>
            <div className="flex size-11 items-center justify-center rounded-full bg-[#1D9E75] text-sm font-semibold shadow-lg">
              CD
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-5">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Où allez-vous ?"
              className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-lg outline-none focus:ring-2 focus:ring-[#1D9E75]"
            />
          </div>
        </header>

        {/* Transport mode chips */}
        <section className="px-6 pt-6" aria-label="Modes de transport">
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {transportModes.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#1D9E75] hover:text-[#1D9E75]"
              >
                <Icon className="size-4 text-[#1D9E75]" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Recent trips */}
        <section className="px-6 pt-7" aria-label="Trajets récents">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Trajets récents</h2>
            <button type="button" className="text-xs font-medium text-[#1D9E75]">
              Tout voir
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {recentTrips.map((trip) => (
              <div
                key={`${trip.from}-${trip.to}`}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <span className="size-2.5 rounded-full bg-slate-300" aria-hidden="true" />
                      <span className="my-1 h-6 w-px bg-slate-200" aria-hidden="true" />
                      <MapPin className="size-3.5 text-[#1D9E75]" aria-hidden="true" />
                    </div>
                    <div className="flex flex-1 flex-col gap-3">
                      <p className="text-sm font-medium leading-tight text-slate-900">{trip.from}</p>
                      <p className="text-sm font-medium leading-tight text-slate-900">{trip.to}</p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2.5 py-1 text-xs font-semibold text-[#1D9E75]">
                    <Leaf className="size-3" aria-hidden="true" />
                    {trip.co2}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">{trip.mode}</span>
                  <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CO2 savings banner */}
        <section className="px-6 pt-6">
          <div className="flex items-center gap-4 rounded-2xl bg-[#1D9E75] p-5 text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)]">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Leaf className="size-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-white/80">Ce mois-ci, vous avez économisé</p>
              <p className="text-xl font-bold tracking-tight">14,6 kg de CO₂</p>
            </div>
          </div>
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
