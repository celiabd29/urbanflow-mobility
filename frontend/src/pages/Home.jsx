import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import api, { tokenStore } from '@/lib/api'
import { Button } from '@/components/ui/button'

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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-7 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Bienvenue 👋</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {me && (
        <p className="text-sm text-muted-foreground">
          Connecté en tant que{' '}
          <span className="font-medium text-foreground">{me.email}</span>
        </p>
      )}
      <Button
        onClick={logout}
        className="mt-2 h-11 gap-2 rounded-2xl bg-primary px-5 text-primary-foreground hover:bg-primary/90"
      >
        <LogOut className="size-4" /> Se déconnecter
      </Button>
    </div>
  )
}
