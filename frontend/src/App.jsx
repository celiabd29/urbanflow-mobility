import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { tokenStore } from '@/lib/api'
import { initReportSync } from '@/lib/reportSync'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Home from '@/pages/Home'
import MapPage from '@/pages/Map'
import MobilityProfile from '@/pages/MobilityProfile'
import CarbonFootprint from '@/pages/CarbonFootprint'
import Trips from '@/pages/Trips'
import Profile from '@/pages/Profile'
import ReportIncident from '@/pages/ReportIncident'
import AdminDashboard from '@/pages/AdminDashboard'

// Garde d'authentification : sans token, on renvoie vers /login.
function RequireAuth({ children }) {
  return tokenStore.getAccess() ? children : <Navigate to="/login" replace />
}

// Définition des routes de l'application.
// BrowserRouter est fourni par main.jsx (il englobe <App />).
function App() {
  // Rejeu automatique des signalements créés hors ligne, dès le retour du réseau.
  useEffect(() => {
    initReportSync()
  }, [])

  return (
    <Routes>
      {/* Racine : l'accueil personnalisé est réservé aux comptes connectés.
          Un visiteur est envoyé vers la carte, en accès libre. */}
      <Route
        path="/"
        element={
          tokenStore.getAccess() ? <Home /> : <Navigate to="/map" replace />
        }
      />
      {/* Carte interactive : accès libre (consultation). Le calcul d'itinéraire,
          le signalement et les fonctions personnelles demandent une connexion. */}
      <Route path="/map" element={<MapPage />} />
      {/* Signalement d'incident (FC2). */}
      <Route
        path="/signaler"
        element={
          <RequireAuth>
            <ReportIncident />
          </RequireAuth>
        }
      />
      {/* Onglets de la barre de navigation. */}
      <Route
        path="/trajets"
        element={
          <RequireAuth>
            <Trips />
          </RequireAuth>
        }
      />
      <Route
        path="/profil"
        element={
          <RequireAuth>
            <Profile />
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
      {/* Tableau de bord d'administration : l'écran redirige lui-même les
          non-admins (403 de l'API). */}
      <Route
        path="/administration"
        element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        }
      />
      {/* Toute route inconnue renvoie vers /login. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
