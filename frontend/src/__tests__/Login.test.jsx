import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Login from '@/pages/Login'
import api, { tokenStore } from '@/lib/api'

// api est mocké : aucun appel réseau réel pendant les tests.
vi.mock('@/lib/api', () => ({
  default: { post: vi.fn() },
  tokenStore: {
    getAccess: vi.fn(() => null),
    getRefresh: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>ÉCRAN ACCUEIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tokenStore.getAccess.mockReturnValue(null)
  })

  it('affiche les champs email et mot de passe', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /se connecter/i }),
    ).toBeInTheDocument()
  })

  it('affiche un message d’erreur en français si la connexion échoue', async () => {
    // Le backend (locale en-us) renvoie ce message ; il doit être traduit.
    api.post.mockRejectedValue({
      response: {
        data: { detail: 'No active account found with the given credentials' },
      },
    })
    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'jury@urbanflow.fr' },
    })
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'mauvais' },
    })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(
      await screen.findByText('Email ou mot de passe incorrect.'),
    ).toBeInTheDocument()
  })

  it('redirige vers l’accueil si l’utilisateur est déjà connecté', () => {
    tokenStore.getAccess.mockReturnValue('un-token-valide')
    renderLogin()

    // Le garde renvoie <Navigate to="/"> : l'accueil s'affiche, pas le formulaire.
    expect(screen.getByText('ÉCRAN ACCUEIL')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /se connecter/i }),
    ).not.toBeInTheDocument()
  })
})
