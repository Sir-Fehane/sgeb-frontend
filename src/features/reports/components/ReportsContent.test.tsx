import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ReportsContent,
  type ReportsContentProps,
} from '@/features/reports/components/ReportsContent'
import { WAITER_PERFORMANCE_REPORT_FIXTURE } from '@/features/reports/fixtures/reportFixtures'
import type { ReportFilterState } from '@/features/reports/types/report'

const DEFAULT_FILTERS: ReportFilterState = {
  fechaDesde: '2026-07-01',
  fechaHasta: '2026-07-31',
  orden: 'calificacion',
}

function renderContent(overrides: Partial<ReportsContentProps> = {}) {
  const onFilterChange = overrides.onFilterChange ?? vi.fn()
  render(
    <ReportsContent
      items={WAITER_PERFORMANCE_REPORT_FIXTURE}
      filters={DEFAULT_FILTERS}
      onFilterChange={onFilterChange}
      {...overrides}
    />,
  )
  return { onFilterChange }
}

describe('ReportsContent', () => {
  it('renders the populated table when items is non-empty and isLoading/errorMessage are absent', () => {
    renderContent()

    const first = WAITER_PERFORMANCE_REPORT_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture item')
    }
    expect(screen.getByText(first.nombreCompleto)).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: /Cargando/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders only the loading state when isLoading is true — no rows underneath, no empty state', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando reporte de desempeño' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.queryByText('No encontramos resultados para este periodo.'),
    ).not.toBeInTheDocument()
  })

  it('renders only the error state when errorMessage is set, taking priority over items — no rows underneath', () => {
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('invokes onRetry from the error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Error.', onRetry })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders the empty state when items is an empty array', () => {
    renderContent({ items: [] })

    expect(
      screen.getByText('No encontramos resultados para este periodo.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('keeps zero-valued metrics visible — zero is not treated as empty', () => {
    const zeroValued = [
      {
        uuidUsuario: 'c3d4e5f6-a7b8-4c1d-9e2f-000000000099',
        nombreCompleto: 'Waiter Cero',
        eventosApartados: 0,
        asistenciasConfirmadas: 0,
        inasistencias: 0,
        porcentajeAsistencia: 0,
        calificacionPromedio: 0,
        calificacionesRecibidas: 0,
        montoPagado: 0,
        montoPendiente: 0,
        clabeVigente: false,
      },
    ]
    renderContent({ items: zeroValued })

    expect(screen.getByText('Waiter Cero')).toBeInTheDocument()
    expect(
      screen.queryByText('No encontramos resultados para este periodo.'),
    ).not.toBeInTheDocument()
  })

  it('always renders the header and filters alongside whichever state is active', () => {
    renderContent({ isLoading: true })

    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument()
  })
})
