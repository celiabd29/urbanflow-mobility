import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api, { tokenStore } from '@/lib/api'
import { extractError } from '@/lib/routing'

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // Déjà connecté : inutile de montrer le formulaire, on va à l'accueil.
  if (tokenStore.getAccess()) return <Navigate to="/" replace />

  // Soumission : appel API login -> stockage des tokens -> page protégée.
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      tokenStore.set(data) // stocke access + refresh
      navigate('/')
    } catch (err) {
      setError(extractError(err, 'La connexion a échoué. Réessayez.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    // Conteneur centré, largeur "mobile" (PWA). min-h-screen permet au lien
    // du bas (mt-auto) de se caler en bas de l'écran.
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-7 pb-8 pt-16">
      {/* Espace pour la barre de statut */}
      <div className="h-4" />

      {/* Logo + titre */}
      <header className="mt-6 flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary shadow-[0_16px_40px_-12px_rgba(29,158,117,0.7)]">
          <Route className="size-10 text-primary-foreground" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          UrbanFlow
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          Déplacez-vous dans la ville, sans effort.
        </p>
      </header>

      {/* Bannière d'erreur */}
      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Bannière d'information (ex. mot de passe oublié pas encore dispo) */}
      {info && (
        <p className="mt-6 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground">
          {info}
        </p>
      )}

      {/* Formulaire */}
      <form className="mt-10 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@urbanflow.app"
              className="h-13 w-full rounded-2xl border border-border bg-input/60 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="h-13 w-full rounded-2xl border border-border bg-input/60 py-3.5 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Link
          to="/mot-de-passe-oublie"
          className="-mt-1 self-end text-xs font-medium text-primary transition hover:opacity-80"
        >
          Mot de passe oublié ?
        </Link>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-13 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_rgba(29,158,117,0.8)] hover:bg-primary/90"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      {/* Lien vers l'inscription (React Router) */}
      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        {'Pas encore de compte ? '}
        <Link to="/register" className="font-semibold text-primary transition hover:opacity-80">
          S&apos;inscrire
        </Link>
      </p>
    </div>
  )
}
