import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WaitersEmptyState } from '@/features/waiters/components/WaitersEmptyState'

describe('WaitersEmptyState', () => {
  it('renders clear empty-state text', () => {
    render(<WaitersEmptyState />)

    expect(
      screen.getByText('No hay meseros que coincidan con los filtros actuales.'),
    ).toBeInTheDocument()
  })
})
