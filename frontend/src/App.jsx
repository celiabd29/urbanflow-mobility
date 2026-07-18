import { Routes, Route, Navigate } from 'react-router-dom'
import { tokenStore } from '@/lib/api'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Home from '@/pages/Home'
import MapPage from '@/pages/Map'
import MobilityProfile from '@/pages/MobilityProfile'
import CarbonFootprint from '@/pages/CarbonFootprint'

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
      {/* Carte interactive (Sprint 2), protégée comme le reste de l'app. */}
      <Route
        path="/map"
        element={
          <RequireAuth>
            <MapPage />
          </RequireAuth>
        }
      />
      {/* Bilan carbone mensuel (Sprint 4). */}
      <Route
        path="/carbone"
        element={
          <RequireAuth>
            <CarbonFootprint />
          </RequireAuth>
        }
      />
      {/* Configuration du profil de mobilité, juste après l'inscription. */}
      <Route
        path="/onboarding/mobility"
        element={
          <RequireAuth>
            <MobilityProfile />
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
