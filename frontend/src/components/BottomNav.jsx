import { NavLink } from 'react-router-dom'
import { Clock, Home, LogIn, Map as MapIcon, User } from 'lucide-react'
import { tokenStore } from '@/lib/api'

// Onglets de la maquette, dans le même ordre sur tous les écrans.
const TABS = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/map', label: 'Carte', icon: MapIcon },
  { to: '/trajets', label: 'Trajets', icon: Clock },
  { to: '/profil', label: 'Profil', icon: User },
]

// Visiteur : l'accueil, les trajets et le profil demandent un compte. On ne
// garde donc que la carte (accès libre) et un bouton pour se connecter, plutôt
// que des onglets qui renverraient sèchement vers la connexion.
const GUEST_TABS = [
  { to: '/map', label: 'Carte', icon: MapIcon },
  { to: '/login', label: 'Se connecter', icon: LogIn },
]

/**
 * Barre de navigation basse, présente sur tous les écrans applicatifs.
 *
 * Elle est en thème clair sur toutes les maquettes, y compris par-dessus la
 * carte : les couleurs sont donc explicites, index.css appliquant le thème
 * sombre globalement.
 */
export default function BottomNav() {
  const isGuest = !tokenStore.getAccess()
  const tabs = isGuest ? GUEST_TABS : TABS

  return (
    <nav
      aria-label="Navigation principale"
      // z-[1002] : au-dessus de Leaflet (~800) ET du panneau bas de la carte
      // (RouteSheet, z-1001), sinon la barre serait masquée sur l'écran Carte.
      className="fixed inset-x-0 bottom-0 z-[1002] border-t border-slate-200 bg-white/95 pb-6 pt-2.5 backdrop-blur"
    >
      <ul
        className={`mx-auto flex max-w-md items-center px-8 ${
          isGuest ? 'justify-center gap-20' : 'justify-between'
        }`}
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-xs font-medium transition ${
                  isActive ? 'text-[#0F7B58]' : 'text-slate-500 hover:text-slate-600'
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
