import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

/**
 * Bouton de suppression d'un trajet, avec confirmation en deux temps intégrée.
 *
 * Conçu pour fonctionner y compris à l'intérieur d'un <Link> (accueil) : chaque
 * clic stoppe la propagation et empêche la navigation. `onConfirm` doit
 * renvoyer une promesse (l'appel réseau de suppression).
 */
export default function TripDeleteButton({ onConfirm, className = '' }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const stop = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleDelete(e) {
    stop(e)
    setBusy(true)
    try {
      await onConfirm()
      // En cas de succès le composant est généralement démonté (le trajet
      // disparaît de la liste) : inutile de remettre l'état à zéro.
    } catch {
      // Échec : on revient à l'état initial pour permettre une nouvelle tentative.
      setBusy(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`} onClick={stop}>
        <button
          type="button"
          onClick={(e) => {
            stop(e)
            setConfirming(false)
          }}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
          Supprimer
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      aria-label="Supprimer le trajet"
      onClick={(e) => {
        stop(e)
        setConfirming(true)
      }}
      className={`flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-500 ${className}`}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  )
}
