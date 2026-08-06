import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReportsLoadingState } from '@/features/reports/components/ReportsLoadingState'

describe('ReportsLoadingState', () => {
  it('exposes a single accessible loading status', () => {
    render(<ReportsLoadingState />)

    expect(
      screen.getByRole('status', { name: 'Cargando reporte de desempeño' }),
    ).toBeInTheDocument()
  })
})
