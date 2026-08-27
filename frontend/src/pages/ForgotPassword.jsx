import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { extractError } from '@/lib/routing'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null) // { detail, uid?, token? }
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/users/password-reset/request/', { email })
      setResult(data)
    } catch (err) {
      setError(extractError(err, 'Demande impossible. Réessayez.'))
    } finally {
      setLoading(false)
    }
  }

  // Lien de réinitialisation, renvoyé seulement si le compte existe.
  const resetPath = result?.token
    ? `/reinitialiser-mot-de-passe?uid=${result.uid}&token=${result.token}`
    : null

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-7 pb-8 pt-16">
      <div className="h-4" />

      <header className="mt-6 flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary shadow-[0_16px_40px_-12px_rgba(29,158,117,0.7)]">
          <Route className="size-10 text-primary-foreground" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Mot de passe oublié
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </p>
      </header>

      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {!result ? (
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

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-13 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_rgba(29,158,117,0.8)] hover:bg-primary/90"
          >
            {loading ? 'Envoi…' : 'Générer le lien'}
          </Button>
        </form>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground">
            {result.detail}
          </p>

          {resetPath && (
            <Link
              to={resetPath}
              className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_rgba(29,158,117,0.8)] transition hover:bg-primary/90"
            >
              Réinitialiser mon mot de passe
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary transition hover:opacity-80">
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
