import { CloudOff } from 'lucide-react'

/**
 * Badge discret signalant que les données affichées viennent du cache local
 * (réseau indisponible) : l'utilisateur voit qu'il ne regarde pas forcément
 * l'état le plus récent.
 */
export default function OfflineBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 ${className}`}
    >
      <CloudOff className="size-3.5" aria-hidden="true" />
      Données hors ligne
    </span>
  )
}
