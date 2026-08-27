import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OfflineBadge from '@/components/OfflineBadge'

describe('OfflineBadge', () => {
  it('affiche le libellé « Données hors ligne »', () => {
    render(<OfflineBadge />)
    expect(screen.getByText('Données hors ligne')).toBeInTheDocument()
  })

  it('est présent quand fromCache est true, absent sinon', () => {
    // Reproduit le rendu conditionnel utilisé par les écrans (Home, Trajets…).
    const { rerender } = render(<>{true && <OfflineBadge />}</>)
    expect(screen.getByText('Données hors ligne')).toBeInTheDocument()

    rerender(<>{false && <OfflineBadge />}</>)
    expect(screen.queryByText('Données hors ligne')).not.toBeInTheDocument()
  })
})
