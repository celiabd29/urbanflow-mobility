import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Route, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

export default function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password2: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fabrique un handler onChange pour une clé donnée du formulaire.
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Soumission : validation locale du mot de passe puis appel API register.
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register/', form)
      navigate('/login') // inscription OK -> page de connexion
    } catch (err) {
      const d = err.response?.data
      // DRF renvoie { champ: ["message"] } : on affiche la 1re erreur.
      const first = d && typeof d === 'object' ? Object.values(d)[0] : null
      setError(Array.isArray(first) ? first[0] : first || "Échec de l'inscription.")
    } finally {
      setLoading(false)
    }
  }

  return (
    // Même conteneur mobile centré que Login (min-h-screen pour caler le lien du bas).
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-7 pb-8 pt-16">
      {/* Espace pour la barre de statut */}
      <div className="h-4" />

      {/* Logo + titre */}
      <header className="mt-4 flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-primary shadow-[0_16px_40px_-12px_rgba(29,158,117,0.7)]">
          <Route className="size-8 text-primary-foreground" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Créer un compte
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          Rejoignez UrbanFlow et prenez la ville en main.
        </p>
      </header>

      {/* Bannière d'erreur */}
      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Formulaire */}
      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="firstName" className="text-xs font-medium text-muted-foreground">
              Prénom
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                value={form.first_name}
                onChange={update('first_name')}
                placeholder="Camille"
                className="h-13 w-full rounded-2xl border border-border bg-input/60 py-3.5 pl-11 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="lastName" className="text-xs font-medium text-muted-foreground">
              Nom
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={form.last_name}
              onChange={update('last_name')}
              placeholder="Durand"
              className="h-13 w-full rounded-2xl border border-border bg-input/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

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
              value={form.email}
              onChange={update('email')}
              placeholder="vous@urbanflow.app"
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
              autoComplete="new-password"
              required
              value={form.password}
              onChange={update('password')}
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
          <label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={form.password2}
              onChange={update('password2')}
              placeholder="Retapez votre mot de passe"
              className="h-13 w-full rounded-2xl border border-border bg-input/60 py-3.5 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-3 h-13 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_rgba(29,158,117,0.8)] hover:bg-primary/90"
        >
          {loading ? 'Création…' : 'Créer mon compte'}
        </Button>
      </form>

      {/* Lien vers la connexion (React Router) */}
      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        {'Déjà un compte ? '}
        <Link to="/login" className="font-semibold text-primary transition hover:opacity-80">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
