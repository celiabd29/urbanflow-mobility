import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import JourneyOptions from '@/components/JourneyOptions'

// Deux propositions transport en commun : une en métro, une en RER + bus.
const journeys = [
  {
    duration_s: 1200,
    nb_transfers: 0,
    sections: [
      { type: 'walking' },
      { type: 'public_transport', mode: 'Metro', line: 'M6', line_color: '#6ECA97' },
      { type: 'walking' },
    ],
  },
  {
    duration_s: 1500,
    nb_transfers: 1,
    sections: [
      { type: 'public_transport', mode: 'RER', line: 'RER C', line_color: '#FFCE00' },
      { type: 'transfer' },
      { type: 'public_transport', mode: 'Bus', line: '63', line_color: '#00814F' },
    ],
  },
]

describe('JourneyOptions', () => {
  it("n'affiche rien s'il n'y a qu'un itinéraire", () => {
    const { container } = render(
      <JourneyOptions journeys={[journeys[0]]} selected={0} onSelect={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('liste chaque itinéraire avec ses lignes et sa durée', () => {
    render(<JourneyOptions journeys={journeys} selected={0} onSelect={() => {}} />)

    expect(screen.getByText('2 itinéraires possibles')).toBeInTheDocument()
    // Les lignes des deux propositions sont visibles pour comparer les modes.
    expect(screen.getByText('M6')).toBeInTheDocument()
    expect(screen.getByText('RER C')).toBeInTheDocument()
    expect(screen.getByText('63')).toBeInTheDocument()
    // Direct vs correspondance.
    expect(screen.getByText('Direct')).toBeInTheDocument()
    expect(screen.getByText('1 correspondance')).toBeInTheDocument()
  })

  it('remonte le choix de l\'utilisateur', () => {
    const onSelect = vi.fn()
    render(<JourneyOptions journeys={journeys} selected={0} onSelect={onSelect} />)

    // Le second itinéraire (RER C) est cliqué.
    fireEvent.click(screen.getByText('RER C').closest('button'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('marque comme actif l\'itinéraire sélectionné', () => {
    render(<JourneyOptions journeys={journeys} selected={1} onSelect={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
  })
})
