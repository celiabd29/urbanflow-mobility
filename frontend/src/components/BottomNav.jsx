import { NavLink } from 'react-router-dom'
import { Clock, Home, Map as MapIcon, User } from 'lucide-react'

// Onglets de la maquette, dans le même ordre sur tous les écrans.
const TABS = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/map', label: 'Carte', icon: MapIcon },
  { to: '/trajets', label: 'Trajets', icon: Clock },
  { to: '/profil', label: 'Profil', icon: User },
]

/**
 * Barre de navigation basse, présente sur tous les écrans applicatifs.
 *
 * Elle est en thème clair sur toutes les maquettes, y compris par-dessus la
 * carte : les couleurs sont donc explicites, index.css appliquant le thème
 * sombre globalement.
 */
export default function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      // z-[1000] : Leaflet monte jusqu'à ~800, la barre doit rester au-dessus.
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-200 bg-white/95 pb-6 pt-2.5 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between px-8">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-xs font-medium transition ${
                  isActive ? 'text-[#1D9E75]' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="size-5"
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
