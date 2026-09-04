// Réglage de confidentialité : notifications de perturbations sur les lignes
// de l'utilisateur. Choix propre à l'appareil (localStorage), désactivé par
// défaut : les notifications exigent une permission explicite du navigateur.
//
// Une notification n'est envoyée que pour une perturbation encore jamais
// signalée sur cet appareil (déduplication par identifiant), pour ne pas
// répéter la même alerte à chaque ouverture de l'app.
const PREF_KEY = 'uf_notifications_enabled'
const SEEN_KEY = 'uf_notified_disruptions'
// Borne le journal des perturbations déjà notifiées, pour ne pas grossir sans fin.
const SEEN_LIMIT = 200

export function supportsNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
}

// Préférence brute, indépendante de la permission : pilote l'affichage de
// l'interrupteur (l'utilisateur a demandé les notifications).
export function notificationsPreferred() {
  try {
    return localStorage.getItem(PREF_KEY) === 'true'
  } catch {
    return false
  }
}

// Actives seulement si l'utilisateur les a demandées ET que le navigateur a
// bien accordé la permission : sinon on n'essaie jamais d'en afficher.
export function isNotificationsEnabled() {
  return (
    notificationsPreferred() &&
    supportsNotifications() &&
    Notification.permission === 'granted'
  )
}

// Active les notifications : demande la permission si besoin. Renvoie l'état de
// permission final ('granted', 'denied', 'default') ou 'unsupported'.
export async function enableNotifications() {
  if (!supportsNotifications()) return 'unsupported'
  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission === 'granted') {
    try {
      localStorage.setItem(PREF_KEY, 'true')
    } catch {
      // Stockage indisponible : la préférence ne sera pas mémorisée.
    }
  }
  return permission
}

export function disableNotifications() {
  try {
    localStorage.setItem(PREF_KEY, 'false')
  } catch {
    // Sans effet : la valeur par défaut (désactivé) s'applique.
  }
}

function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function writeSeen(seen) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-SEEN_LIMIT)))
  } catch {
    // Sans effet : au pire une perturbation pourra être re-notifiée.
  }
}

// Affiche la notification via le service worker si possible (nécessaire sur
// mobile), sinon via l'API Notification de la page.
function showNotification(title, options) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        try {
          new Notification(title, options)
        } catch {
          // Environnement sans notification de page : on abandonne en silence.
        }
      })
    return
  }
  try {
    new Notification(title, options)
  } catch {
    // Idem : rien à faire, l'utilisateur verra les perturbations dans l'app.
  }
}

// Notifie les perturbations encore jamais vues sur cet appareil. `data` est la
// réponse de getDisruptions : { total, modes, disruptions: [...] }.
export function maybeNotifyDisruptions(data) {
  if (!isNotificationsEnabled()) return
  const list = data?.disruptions || []
  if (list.length === 0) return

  const seen = readSeen()
  const fresh = list.filter((item) => item.id && !seen.has(String(item.id)))
  if (fresh.length === 0) return

  fresh.forEach((item) => seen.add(String(item.id)))
  writeSeen(seen)

  const first = fresh[0]
  const detail = first.title || first.message || 'Une perturbation est en cours.'
  const title =
    fresh.length === 1
      ? 'Perturbation sur vos lignes'
      : `${fresh.length} perturbations sur vos lignes`

  showNotification(title, {
    body: detail,
    tag: 'uf-disruptions',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    lang: 'fr',
  })
}
