import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Trips from '@/pages/Trips'
import { networkFirst } from '@/lib/offlineStore'

// On mocke la couche offline : networkFirst renvoie directement des données
// contrôlées (le fetcher réseau n'est jamais appelé).
vi.mock('@/lib/offlineStore', () => ({
  networkFirst: vi.fn(),
  saveCache: vi.fn(),
}))

const TRAJET = {
  id: 1,
  date_trajet: '2026-07-19T15:40:00Z',
  depart: 'Gare Montparnasse',
  arrivee: 'Parc Montsouris',
  distance_km: 4.1,
  duree_s: 1080,
  co2_emis_g: 57.4,
  co2_economise_g: 426,
  modes_utilises: [{ mode: 'bus', distance_km: 4.1, co2_g: 57.4 }],
}

function renderTrips() {
  return render(
    <MemoryRouter>
      <Trips />
    </MemoryRouter>,
  )
}

describe('Trips (trajets récents)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche un trajet de la liste (départ → arrivée)', async () => {
    networkFirst.mockResolvedValue({
      data: { count: 1, trajets: [TRAJET] },
      fromCache: false,
    })
    renderTrips()

    expect(
      await screen.findByText('Gare Montparnasse → Parc Montsouris'),
    ).toBeInTheDocument()
  })

  it('affiche le badge « Données hors ligne » quand les données viennent du cache', async () => {
    networkFirst.mockResolvedValue({
      data: { count: 1, trajets: [TRAJET] },
      fromCache: true,
    })
    renderTrips()

    expect(
      await screen.findByText('Gare Montparnasse → Parc Montsouris'),
    ).toBeInTheDocument()
    expect(screen.getByText('Données hors ligne')).toBeInTheDocument()
  })

  it('n’affiche pas le badge quand les données sont fraîches (réseau)', async () => {
    networkFirst.mockResolvedValue({
      data: { count: 1, trajets: [TRAJET] },
      fromCache: false,
    })
    renderTrips()

    await screen.findByText('Gare Montparnasse → Parc Montsouris')
    expect(screen.queryByText('Données hors ligne')).not.toBeInTheDocument()
  })
})
