import api, { tokenStore } from '@/lib/api'
import { deletePendingReport, getPendingReports } from '@/lib/offlineStore'

// Étape 4 : rejeu automatique des signalements créés hors ligne.
// On s'appuie uniquement sur l'event "online" (Background Sync API écartée :
// support inégal, notamment Safari).

const CHANGED = 'pending-reports-changed'

/** Prévient les écrans qu'un signalement a été mis en file ou envoyé. */
export function notifyPendingChanged() {
  window.dispatchEvent(new Event(CHANGED))
}

/** S'abonne aux changements de la file (retourne la fonction de désabonnement). */
export function onPendingChanged(callback) {
  window.addEventListener(CHANGED, callback)
  return () => window.removeEventListener(CHANGED, callback)
}

// Garde-fou : évite deux vidages concurrents (ex. event online + démarrage).
let flushing = false

/**
 * Tente d'envoyer tous les signalements en attente.
 *
 * Succès -> on retire de la file. Panne réseau (pas de réponse serveur) -> on
 * s'arrête et on réessaiera au prochain "online". Erreur serveur -> on garde
 * l'élément (aucune perte) et on passe au suivant.
 */
export async function flushPendingReports() {
  if (flushing || !navigator.onLine || !tokenStore.getAccess()) return
  flushing = true
  try {
    const pending = await getPendingReports()
    for (const item of pending) {
      try {
        await api.post('/signalements/', item.payload)
        await deletePendingReport(item.id)
        notifyPendingChanged()
      } catch (err) {
        // Pas de réponse = réseau encore coupé : inutile d'insister maintenant.
        if (!err.response) break
        // Réponse d'erreur du serveur : on garde et on tente le suivant.
      }
    }
  } finally {
    flushing = false
  }
}

let initialized = false

/**
 * Branche le rejeu automatique au retour de connexion. À appeler une fois au
 * démarrage de l'application.
 */
export function initReportSync() {
  if (initialized) return
  initialized = true
  window.addEventListener('online', flushPendingReports)
  // Au démarrage, si on est déjà en ligne, on purge ce qui restait d'une
  // session précédente.
  if (navigator.onLine) flushPendingReports()
}
