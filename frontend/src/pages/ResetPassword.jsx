import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Lock, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { extractError } from '@/lib/routing'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const uid = params.get('uid')
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const invalidLink = !uid || !token

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await api.post('/users/password-reset/confirm/', { uid, token, password })
      setDone(true)
      // Laisse lire la confirmation avant de renvoyer vers la connexion.
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(extractError(err, 'Réinitialisation impossible.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-7 pb-8 pt-16">
      <div className="h-4" />

      <header className="mt-6 flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary shadow-[0_16px_40px_-12px_rgba(29,158,117,0.7)]">
          <Route className="size-10 text-primary-foreground" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Nouveau mot de passe
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>
      </header>

      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {invalidLink ? (
        <p className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Lien de réinitialisation invalide.{' '}
          <Link to="/mot-de-passe-oublie" className="font-semibold underline">
            Refaire une demande
          </Link>
          .
        </p>
      ) : done ? (
        <p className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 py-4 text-sm font-semibold text-primary">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          Mot de passe réinitialisé ! Redirection vers la connexion…
        </p>
      ) : (
        <form className="mt-10 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password2" className="text-xs font-medium text-muted-foreground">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="password2"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="h-13 w-full rounded-2xl border border-border bg-input/60 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-13 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_rgba(29,158,117,0.8)] hover:bg-primary/90"
          >
            {loading ? 'Réinitialisation…' : 'Réinitialiser'}
          </Button>
        </form>
      )}

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary transition hover:opacity-80">
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
