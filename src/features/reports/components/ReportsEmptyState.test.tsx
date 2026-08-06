import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'

describe('ReportsEmptyState', () => {
  it('explains that no results were found for the period, understandably without relying on the icon', () => {
    render(<ReportsEmptyState />)

    expect(
      screen.getByText('No encontramos resultados para este periodo.'),
    ).toBeInTheDocument()
  })
})
