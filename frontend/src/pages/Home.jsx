import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, LogOut, Map as MapIcon } from 'lucide-react'
import api, { tokenStore } from '@/lib/api'
import { Button } from '@/components/ui/button'
import BottomNav from '@/components/BottomNav'

export default function Home() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')

  // Au montage : on récupère le profil via le token stocké (prouve le JWT).
  useEffect(() => {
    api
      .get('/auth/me/')
      .then(({ data }) => setMe(data))
      .catch(() => setError('Session expirée. Reconnectez-vous.'))
  }, [])

  function logout() {
    tokenStore.clear()
    navigate('/login')
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-7 pb-28 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Bienvenue 👋</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {me && (
        <p className="text-sm text-muted-foreground">
          Connecté en tant que{' '}
          <span className="font-medium text-foreground">{me.email}</span>
        </p>
      )}
      {/* Action principale : accès à la carte (un <Link> et non un <button>,
          pour permettre l'ouverture dans un nouvel onglet). */}
      <Link
        to="/map"
        className="mt-2 flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        <MapIcon className="size-4" aria-hidden="true" /> Ouvrir la carte
      </Link>

      <Link
        to="/carbone"
        className="flex h-11 items-center gap-2 rounded-2xl border border-border px-5 text-sm font-medium text-foreground transition hover:bg-secondary"
      >
        <Leaf className="size-4 text-primary" aria-hidden="true" /> Mon empreinte carbone
      </Link>

      {/* Action secondaire */}
      <Button
        variant="ghost"
        onClick={logout}
        className="h-10 gap-2 rounded-2xl px-4 text-muted-foreground"
      >
        <LogOut className="size-4" /> Se déconnecter
      </Button>

      <BottomNav />
    </div>
  )
}
