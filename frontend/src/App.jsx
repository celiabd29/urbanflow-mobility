import { Routes, Route, Navigate } from 'react-router-dom'
import { tokenStore } from '@/lib/api'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Home from '@/pages/Home'

// Garde d'authentification : sans token, on renvoie vers /login.
function RequireAuth({ children }) {
  return tokenStore.getAccess() ? children : <Navigate to="/login" replace />
}

// Définition des routes de l'application.
// BrowserRouter est fourni par main.jsx (il englobe <App />).
function App() {
  return (
    <Routes>
      {/* Racine protégée : accueil accessible uniquement si connecté. */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Toute route inconnue renvoie vers /login. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
