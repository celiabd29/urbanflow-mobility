'use client'

import { Leaf, Bike, Bus, Users, Car, TrendingDown, Home, Map, Clock, User, Route } from 'lucide-react'

const modes = [
  { label: 'Vélo', value: '0 g/km', width: '2%', color: '#1D9E75', icon: Bike },
  { label: 'Bus', value: '14 g/km', width: '12%', color: '#2563eb', icon: Bus },
  { label: 'Covoiturage', value: '48 g/km', width: '41%', color: '#f59e0b', icon: Users },
  { label: 'Voiture', value: '118 g/km', width: '100%', color: '#ef4444', icon: Car },
]

const stats = [
  { label: 'Trajets ce mois', value: '32', icon: Route },
  { label: 'Km éco-mobiles', value: '186', icon: Leaf },
]

const navItems = [
  { label: 'Accueil', icon: Home, active: false },
  { label: 'Carte', icon: Map, active: false },
  { label: 'Trajets', icon: Clock, active: false },
  { label: 'Profil', icon: User, active: true },
]

export function CarbonScreen() {
  return (
    <div className="flex h-full flex-col bg-[#f8fafc] text-slate-900">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header hero card */}
        <header className="px-5 pt-14">
          <h1 className="px-1 text-xl font-semibold tracking-tight text-slate-900">Empreinte carbone</h1>
          <div className="mt-4 rounded-3xl bg-[#0f3d2e] p-6 text-white shadow-[0_20px_44px_-20px_rgba(15,61,46,0.9)]">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <TrendingDown className="size-4 text-[#1D9E75]" aria-hidden="true" />
              CO₂ économisé ce mois
            </div>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              4,7 <span className="text-2xl font-semibold text-white/70">kg CO₂</span>
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-[#1D9E75]/20 px-3 py-1.5 text-sm font-medium text-[#8ee0be] w-fit">
              <Leaf className="size-4" aria-hidden="true" />
              +18% vs. le mois dernier
            </div>
          </div>
        </header>

        {/* Comparison bar chart */}
        <section className="px-5 pt-7" aria-label="Comparaison des modes de transport">
          <h2 className="px-1 text-base font-semibold text-slate-900">Émissions par mode</h2>
          <div className="mt-3 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            {modes.map(({ label, value, width, color, icon: Icon }) => (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Icon className="size-4" style={{ color }} aria-hidden="true" />
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{value}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width, backgroundColor: color }}
                    role="presentation"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats grid */}
        <section className="px-5 pt-6" aria-label="Statistiques">
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Equivalence note */}
        <section className="px-5 pt-4">
          <div className="flex items-center gap-4 rounded-3xl bg-[#1D9E75] p-5 text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)]">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Leaf className="size-6" aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed text-white/90">
              Soit l&apos;équivalent de <span className="font-bold text-white">3 arbres</span> plantés cette
              année. Continuez comme ça !
            </p>
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
