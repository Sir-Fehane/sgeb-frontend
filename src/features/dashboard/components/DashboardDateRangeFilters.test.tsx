import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DashboardDateRangeFilters } from '@/features/dashboard/components/DashboardDateRangeFilters'

describe('DashboardDateRangeFilters', () => {
  it('renders labeled date controls for "Desde" and "Hasta"', () => {
    render(
      <DashboardDateRangeFilters
        filters={{ fechaDesde: '2026-08-05', fechaHasta: '2026-09-04' }}
        onFilterChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument()
  })

  it('shows a validation error, associated via aria-describedby, for an inverted range', () => {
    render(
      <DashboardDateRangeFilters
        filters={{ fechaDesde: '2026-09-04', fechaHasta: '2026-08-05' }}
        onFilterChange={vi.fn()}
      />,
    )

    const error = screen.getByText(/no puede ser posterior/)
    expect(error).toBeInTheDocument()
    expect(screen.getByLabelText('Desde')).toHaveAccessibleDescription(
      error.textContent ?? '',
    )
    expect(screen.getByLabelText('Hasta')).toHaveAccessibleDescription(
      error.textContent ?? '',
    )
  })

  it('shows a validation error for a range wider than 366 days', () => {
    render(
      <DashboardDateRangeFilters
        filters={{ fechaDesde: '2026-01-01', fechaHasta: '2028-01-01' }}
        onFilterChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/no puede superar 366 días/)).toBeInTheDocument()
  })

  it('shows no error for a valid range', () => {
    render(
      <DashboardDateRangeFilters
        filters={{ fechaDesde: '2026-08-05', fechaHasta: '2026-09-04' }}
        onFilterChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('resets to the documented defaults when "Restablecer rango" is clicked', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <DashboardDateRangeFilters
        filters={{ fechaDesde: '2020-01-01', fechaHasta: '2020-01-02' }}
        onFilterChange={onFilterChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Restablecer rango' }))

    expect(onFilterChange).toHaveBeenCalledOnce()
    const [{ fechaDesde, fechaHasta }] = onFilterChange.mock.calls[0] as [
      { fechaDesde: string; fechaHasta: string },
    ]
    expect(new Date(fechaDesde).getTime()).toBeLessThanOrEqual(
      new Date(fechaHasta).getTime(),
    )
  })

  it('does not expose a "secciones" filter control', () => {
    render(
      <DashboardDateRangeFilters
        filters={{ fechaDesde: '2026-08-05', fechaHasta: '2026-09-04' }}
        onFilterChange={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(/secciones/i)).not.toBeInTheDocument()
  })
})
