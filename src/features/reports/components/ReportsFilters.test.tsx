import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReportsFilters } from '@/features/reports/components/ReportsFilters'
import type { ReportFilterState } from '@/features/reports/types/report'

const VALID_FILTERS: ReportFilterState = {
  fechaDesde: '2026-07-01',
  fechaHasta: '2026-07-31',
  orden: 'calificacion',
}

describe('ReportsFilters', () => {
  it('renders labeled date controls for "Desde" and "Hasta"', () => {
    render(<ReportsFilters filters={VALID_FILTERS} onFilterChange={vi.fn()} />)

    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument()
  })

  it('shows a validation error for an inverted range', () => {
    render(
      <ReportsFilters
        filters={{
          fechaDesde: '2026-08-01',
          fechaHasta: '2026-07-01',
          orden: 'calificacion',
        }}
        onFilterChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/no puede ser posterior/)).toBeInTheDocument()
  })

  it('shows no validation error for a very wide, valid range — no undocumented maximum is enforced', () => {
    render(
      <ReportsFilters
        filters={{
          fechaDesde: '2020-01-01',
          fechaHasta: '2030-01-01',
          orden: 'calificacion',
        }}
        onFilterChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders exactly the three documented orden options with readable labels', () => {
    render(<ReportsFilters filters={VALID_FILTERS} onFilterChange={vi.fn()} />)

    const select = screen.getByLabelText('Ordenar por')
    const options = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent,
    )
    expect(options).toEqual(['Calificación', 'Asistencias', 'Monto pagado'])
  })

  it('exposes no raw UUID input', () => {
    render(<ReportsFilters filters={VALID_FILTERS} onFilterChange={vi.fn()} />)

    expect(screen.queryByLabelText(/uuid/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/mesero/i)).not.toBeInTheDocument()
  })

  it('exposes no page-size control', () => {
    render(<ReportsFilters filters={VALID_FILTERS} onFilterChange={vi.fn()} />)

    expect(screen.queryByLabelText(/página/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/tamaño/i)).not.toBeInTheDocument()
  })
})
