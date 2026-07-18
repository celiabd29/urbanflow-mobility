import axios from 'axios'

// URL de base de l'API Django (surchargeable via un fichier .env : VITE_API_URL).
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// Clés de stockage des tokens JWT dans le localStorage.
const ACCESS_KEY = 'uf_access'
const REFRESH_KEY = 'uf_refresh'

// Petit utilitaire pour lire/écrire/effacer les tokens.
export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: ({ access, refresh }) => {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// Instance axios centralisée pointant vers l'API.
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Intercepteur : ajoute automatiquement le token d'accès à chaque requête.
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// --- Renouvellement automatique du token ---

// Instance "nue" pour le refresh : elle ne passe pas par les intercepteurs,
// ce qui évite toute récursion infinie.
const refreshClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Partagée entre les requêtes : si dix appels échouent en même temps,
// on ne déclenche qu'UN seul refresh.
let refreshPromise = null

function redirectToLogin() {
  tokenStore.clear()
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthError = error.response?.status === 401

    // On ne tente le refresh que sur un 401, une seule fois par requête,
    // et jamais pour l'appel de refresh lui-même.
    if (
      !isAuthError ||
      !original ||
      original._retried ||
      original.url?.includes('/auth/token/refresh/')
    ) {
      return Promise.reject(error)
    }

    const refresh = tokenStore.getRefresh()
    if (!refresh) {
      redirectToLogin()
      return Promise.reject(error)
    }

    original._retried = true

    try {
      refreshPromise =
        refreshPromise ||
        refreshClient
          .post('/auth/token/refresh/', { refresh })
          .then(({ data }) => {
            // Le serveur ne renvoie que 'access' (ROTATE_REFRESH_TOKENS = False) ;
            // tokenStore ignore les valeurs absentes.
            tokenStore.set(data)
            return data.access
          })
          .finally(() => {
            refreshPromise = null
          })

      const newAccess = await refreshPromise
      original.headers = { ...original.headers, Authorization: `Bearer ${newAccess}` }
      return api(original) // on rejoue la requête initiale
    } catch (refreshError) {
      // Refresh expiré (> 24 h) ou invalide : retour à la connexion.
      redirectToLogin()
      return Promise.reject(refreshError)
    }
  },
)

export default api
