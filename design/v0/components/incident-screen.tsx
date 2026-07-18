'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Cone,
  CarFront,
  Wrench,
  CircleAlert,
  Camera,
  MapPin,
  Home,
  Map,
  Clock,
  User,
} from 'lucide-react'

const incidentTypes = [
  { id: 'travaux', label: 'Travaux', icon: Cone },
  { id: 'accident', label: 'Accident', icon: CarFront },
  { id: 'panne', label: 'Panne', icon: Wrench },
  { id: 'autre', label: 'Autre', icon: CircleAlert },
]

const navItems = [
  { label: 'Accueil', icon: Home, active: false },
  { label: 'Carte', icon: Map, active: true },
  { label: 'Trajets', icon: Clock, active: false },
  { label: 'Profil', icon: User, active: false },
]

export function IncidentScreen() {
  const [selectedType, setSelectedType] = useState('travaux')

  return (
    <div className="relative flex h-full flex-col bg-[#f8fafc] text-slate-900">
      {/* Map layer */}
      <div className="absolute inset-0">
        <img
          src="/images/city-map.png"
          alt="Carte pour localiser l'incident"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/5" />

        {/* Location pin (centered on map) */}
        <div className="absolute left-1/2 top-[26%] -translate-x-1/2 -translate-y-full">
          <span className="flex size-11 items-center justify-center rounded-full rounded-bl-none bg-[#1D9E75] shadow-lg">
            <MapPin className="size-5 rotate-45 text-white" aria-hidden="true" />
          </span>
        </div>
        <span
          className="absolute left-1/2 top-[26%] size-3 -translate-x-1/2 rounded-full bg-[#1D9E75]/30 shadow-[0_0_0_8px_rgba(29,158,117,0.15)]"
          aria-hidden="true"
        />
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
          Signaler un incident
        </div>
      </div>

      <div className="flex-1" />

      {/* Bottom sheet form */}
      <div className="relative z-10 rounded-t-[2rem] bg-white px-6 pb-28 pt-4 shadow-[0_-16px_40px_-20px_rgba(15,23,42,0.4)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="size-4 text-[#1D9E75]" aria-hidden="true" />
          Avenue de la République, Paris
        </div>

        {/* Incident type selector */}
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold text-slate-900">Type d&apos;incident</legend>
          <div className="grid grid-cols-4 gap-2">
            {incidentTypes.map(({ id, label, icon: Icon }) => {
              const active = selectedType === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedType(id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition ${
                    active
                      ? 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Comment field */}
        <div className="mt-4">
          <label htmlFor="incident-comment" className="mb-1.5 block text-sm font-semibold text-slate-900">
            Commentaire <span className="font-normal text-slate-400">(optionnel)</span>
          </label>
          <textarea
            id="incident-comment"
            rows={2}
            placeholder="Décrivez la situation…"
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1D9E75] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
          />
        </div>

        {/* Photo upload */}
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-3 text-sm font-medium text-slate-500 transition active:scale-[0.99]"
        >
          <Camera className="size-5" aria-hidden="true" />
          Ajouter une photo <span className="text-slate-400">(optionnel)</span>
        </button>

        {/* Submit */}
        <button
          type="button"
          className="mt-4 h-14 w-full rounded-2xl bg-[#1D9E75] text-base font-semibold text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)] transition active:scale-[0.99]"
        >
          Signaler
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
