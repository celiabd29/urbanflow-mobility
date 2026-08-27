import { describe, it, expect } from 'vitest'
import { MODE_TO_PROFILE, extractError } from '@/lib/routing'

describe('MODE_TO_PROFILE', () => {
  it('mappe chaque mode d’émission vers le bon profil de routage', () => {
    expect(MODE_TO_PROFILE.bike).toBe('cycling-regular')
    expect(MODE_TO_PROFILE.scooter).toBe('cycling-regular')
    expect(MODE_TO_PROFILE.walk).toBe('foot-walking')
    expect(MODE_TO_PROFILE.car).toBe('driving-car')
    expect(MODE_TO_PROFILE.carpool).toBe('driving-car')
    expect(MODE_TO_PROFILE.rail).toBe('transit')
    expect(MODE_TO_PROFILE.bus).toBe('transit')
  })

  it('renvoie undefined pour un mode inconnu', () => {
    expect(MODE_TO_PROFILE.inconnu).toBeUndefined()
  })
})

describe('extractError', () => {
  it('traduit un message backend connu en français', () => {
    const err = {
      response: {
        data: { detail: 'No active account found with the given credentials' },
      },
    }
    expect(extractError(err)).toBe('Email ou mot de passe incorrect.')
  })

  it('traduit une erreur de champ DRF (email déjà pris)', () => {
    const err = {
      response: { data: { email: ['user with this email already exists.'] } },
    }
    expect(extractError(err)).toBe('Cet email est déjà utilisé.')
  })

  it('affiche un message réseau générique en cas d’échec de connexion', () => {
    // Pas de `response` = panne réseau (le serveur n’a pas répondu).
    expect(extractError({})).toBe(
      'Problème de connexion. Vérifiez votre réseau internet.',
    )
  })

  it('renvoie null pour une annulation volontaire (CanceledError)', () => {
    expect(extractError({ name: 'CanceledError' })).toBeNull()
  })

  it('utilise le fallback fourni si le message est inconnu', () => {
    const err = { response: { data: {} } }
    expect(extractError(err, 'Erreur perso.')).toBe('Erreur perso.')
  })
})
