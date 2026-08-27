import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Register from '@/pages/Register'
import api from '@/lib/api'

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn() },
  tokenStore: { set: vi.fn(), getAccess: vi.fn(() => null) },
}))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

function fillForm({ password, password2 }) {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'nouveau@urbanflow.fr' },
  })
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
    target: { value: password2 },
  })
}

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche les champs du formulaire', () => {
    renderRegister()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Confirmer le mot de passe'),
    ).toBeInTheDocument()
  })

  it('refuse la soumission si les mots de passe diffèrent (sans appeler l’API)', async () => {
    renderRegister()
    fillForm({ password: 'MotDePasse2026!', password2: 'Different2026!' })
    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    expect(
      await screen.findByText('Les mots de passe ne correspondent pas.'),
    ).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('affiche « email déjà utilisé » si le backend le signale', async () => {
    api.post.mockRejectedValue({
      response: { data: { email: ['user with this email already exists.'] } },
    })
    renderRegister()
    fillForm({ password: 'MotDePasse2026!', password2: 'MotDePasse2026!' })
    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    expect(
      await screen.findByText('Cet email est déjà utilisé.'),
    ).toBeInTheDocument()
  })

  it('affiche l’erreur de mot de passe trop court', async () => {
    api.post.mockRejectedValue({
      response: {
        data: {
          password: [
            'This password is too short. It must contain at least 8 characters.',
          ],
        },
      },
    })
    renderRegister()
    fillForm({ password: 'court', password2: 'court' })
    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    expect(
      await screen.findByText(
        'Le mot de passe doit contenir au moins 8 caractères.',
      ),
    ).toBeInTheDocument()
  })
})
