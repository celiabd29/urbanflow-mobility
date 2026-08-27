import { openDB } from 'idb'

// Cache local des données dynamiques, pour consultation hors ligne.
// - STORE : magasin clé -> valeur pour les instantanés figés (trajets, dernier
//   itinéraire) qu'on relit sans réseau.
// - REPORTS : file d'attente des signalements créés hors ligne, rejoués au
//   retour de connexion (étape 4).
const DB_NAME = 'urbanflow-offline'
const DB_VERSION = 2
const STORE = 'cache'
const REPORTS = 'pendingReports'

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      if (!db.objectStoreNames.contains(REPORTS)) {
        // Clé auto-incrémentée : chaque signalement en attente a son id.
        db.createObjectStore(REPORTS, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

/** Écrit un instantané. Best-effort : un échec IndexedDB ne casse rien. */
export async function saveCache(key, value) {
  try {
    const db = await getDB()
    await db.put(STORE, { value, savedAt: Date.now() }, key)
  } catch {
    // Le cache est un bonus, jamais un point de rupture.
  }
}

/** Relit un instantané, ou null s'il n'y en a pas. */
export async function readCache(key) {
  try {
    const db = await getDB()
    const entry = await db.get(STORE, key)
    return entry ? entry.value : null
  } catch {
    return null
  }
}

/**
 * Stratégie « network-first » : on tente le réseau, on rafraîchit le cache au
 * succès, et on bascule sur IndexedDB en cas d'échec (hors ligne).
 *
 * Renvoie { data, fromCache } pour que l'écran sache s'il montre des données
 * fraîches ou figées. Ne concerne QUE la consultation : les appels de calcul
 * d'itinéraire (ORS/PRIM) restent du réseau pur, non couvert ici.
 */
export async function networkFirst(key, fetcher) {
  try {
    const data = await fetcher()
    saveCache(key, data) // best-effort, on n'attend pas l'écriture
    return { data, fromCache: false }
  } catch (err) {
    const cached = await readCache(key)
    if (cached != null) return { data: cached, fromCache: true }
    throw err // rien en cache : l'appelant gère l'erreur normalement
  }
}

// --- File d'attente des signalements créés hors ligne (étape 4) ---

/** Ajoute un signalement à la file. Renvoie son id auto-généré. */
export async function queueReport(payload) {
  const db = await getDB()
  return db.add(REPORTS, { payload, queuedAt: Date.now() })
}

/** Tous les signalements en attente, avec leur id. */
export async function getPendingReports() {
  try {
    const db = await getDB()
    return db.getAll(REPORTS)
  } catch {
    return []
  }
}

/** Retire un signalement de la file (après envoi réussi). */
export async function deletePendingReport(id) {
  const db = await getDB()
  await db.delete(REPORTS, id)
}

/** Nombre de signalements en attente (pour le badge). */
export async function countPendingReports() {
  try {
    const db = await getDB()
    return db.count(REPORTS)
  } catch {
    return 0
  }
}
