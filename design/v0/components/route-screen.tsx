'use client'

import { Bike, TrainFront, Footprints, Leaf, Home, Map, Clock, User, ArrowLeft, Navigation } from 'lucide-react'

const steps = [
  { label: 'Vélo', detail: 'Vers Gare RER · 8 min', icon: Bike, duration: '8 min' },
  { label: 'RER A', detail: 'Nation → La Défense · 22 min', icon: TrainFront, duration: '22 min' },
  { label: 'Marche', detail: "Jusqu'à destination · 8 min", icon: Footprints, duration: '8 min' },
]

const navItems = [
  { label: 'Accueil', icon: Home, active: false },
  { label: 'Carte', icon: Map, active: true },
  { label: 'Trajets', icon: Clock, active: false },
  { label: 'Profil', icon: User, active: false },
]

export function RouteScreen() {
  return (
    <div className="relative flex h-full flex-col bg-[#f8fafc] text-slate-900">
      {/* Map layer */}
      <div className="absolute inset-0">
        <img
          src="/images/city-map.png"
          alt="Carte de la ville avec l'itinéraire"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/5" />

        {/* Route overlay */}
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 320 500"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          aria-hidden="true"
        >
          {/* Blue segment (RER) */}
          <path
            d="M70 120 C 120 160, 150 190, 175 240"
            stroke="#2563eb"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Green segment (vélo + marche) */}
          <path
            d="M175 240 C 200 290, 230 320, 250 380"
            stroke="#1D9E75"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M70 120 C 120 160, 150 190, 175 240"
            stroke="#2563eb"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="0.1 14"
            opacity="0.35"
          />
        </svg>

        {/* Start pin */}
        <div className="absolute left-[19%] top-[22%] -translate-x-1/2 -translate-y-1/2">
          <span className="flex size-5 items-center justify-center rounded-full border-4 border-white bg-[#1D9E75] shadow-lg" />
        </div>
        {/* End pin */}
        <div className="absolute left-[76%] top-[74%] -translate-x-1/2 -translate-y-full">
          <span className="flex size-9 items-center justify-center rounded-full rounded-bl-none bg-[#0f3d2e] shadow-lg">
            <Navigation className="size-4 rotate-45 text-white" fill="currentColor" />
          </span>
        </div>
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-14">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-md"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex h-11 flex-1 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-700 shadow-md">
          La Défense, Paris
        </div>
      </div>

      <div className="flex-1" />

      {/* Bottom sheet */}
      <div className="relative z-10 rounded-t-[2rem] bg-white px-6 pb-28 pt-4 shadow-[0_-16px_40px_-20px_rgba(15,23,42,0.4)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">Durée du trajet</p>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              38 <span className="text-xl font-semibold text-slate-500">min</span>
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-[#1D9E75]/10 px-3 py-1.5 text-sm font-semibold text-[#1D9E75]">
            <Leaf className="size-4" aria-hidden="true" />
            2,4 kg CO₂ économisés
          </span>
        </div>

        {/* Steps */}
        <ol className="mt-5 flex flex-col gap-1" aria-label="Étapes du trajet">
          {steps.map(({ label, detail, icon: Icon, duration }, index) => (
            <li key={label} className="flex items-center gap-4">
              <div className="flex flex-col items-center self-stretch">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {index < steps.length - 1 && (
                  <span className="my-1 w-px flex-1 bg-slate-200" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between border-b border-slate-100 py-3 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">{detail}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">{duration}</span>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          className="mt-5 h-14 w-full rounded-2xl bg-[#1D9E75] text-base font-semibold text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)] transition active:scale-[0.99]"
        >
          Démarrer le trajet
        </button>
      </div>

      {/* Bottom navigation */}
      <nav className="absolute inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-6 pb-7 pt-3 backdrop-blur">
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
