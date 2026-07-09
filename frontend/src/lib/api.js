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

export default api
