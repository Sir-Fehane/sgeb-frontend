import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'

describe('ReportsEmptyState', () => {
  it('shows a generic "no results" message by default, understandably without relying on the icon', () => {
    render(<ReportsEmptyState />)

    expect(screen.getByText('No encontramos resultados.')).toBeInTheDocument()
  })

  it('renders a caller-supplied message instead when provided', () => {
    render(<ReportsEmptyState message="Aún no hay calificaciones para este evento." />)

    expect(
      screen.getByText('Aún no hay calificaciones para este evento.'),
    ).toBeInTheDocument()
  })
})
