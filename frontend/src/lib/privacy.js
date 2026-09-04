// Réglage de confidentialité : autoriser l'app à utiliser la géolocalisation.
// Stocké par appareil (localStorage), car c'est un choix propre au navigateur
// et à l'appareil. Activé par défaut (comportement actuel) ; l'utilisateur peut
// le désactiver, auquel cas l'app ne demande jamais la position.
const KEY = 'uf_geolocation_enabled'

export function isGeolocationEnabled() {
  try {
    // Défaut activé : seule la valeur explicite 'false' désactive.
    return localStorage.getItem(KEY) !== 'false'
  } catch {
    return true
  }
}

export function setGeolocationEnabled(enabled) {
  try {
    localStorage.setItem(KEY, enabled ? 'true' : 'false')
  } catch {
    // Stockage indisponible : sans effet, la valeur par défaut s'applique.
  }
}
