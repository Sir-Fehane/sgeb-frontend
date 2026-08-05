import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  CaptainDashboardContent,
  type CaptainDashboardContentProps,
} from '@/features/dashboard/components/CaptainDashboardContent'
import {
  CAPTAIN_DASHBOARD_FIXTURE,
  EMPTY_CAPTAIN_DASHBOARD_FIXTURE,
} from '@/features/dashboard/fixtures/dashboardFixtures'
import { getDefaultDashboardDateFilterState } from '@/features/dashboard/utils/dashboardDateRange'

function renderContent(overrides: Partial<CaptainDashboardContentProps> = {}) {
  const onFilterChange = overrides.onFilterChange ?? vi.fn()
  render(
    <CaptainDashboardContent
      dashboard={CAPTAIN_DASHBOARD_FIXTURE}
      filters={getDefaultDashboardDateFilterState()}
      onFilterChange={onFilterChange}
      {...overrides}
    />,
  )
  return { onFilterChange }
}

describe('CaptainDashboardContent', () => {
  it('renders the populated dashboard when isLoading/errorMessage are absent', () => {
    renderContent()

    expect(screen.getByText('Resumen de eventos')).toBeInTheDocument()
    expect(screen.getByText('Próximos eventos')).toBeInTheDocument()
    expect(screen.getByText('Riesgo de personal')).toBeInTheDocument()
    expect(screen.getByText('Operación en curso')).toBeInTheDocument()
    expect(screen.getByText('Cierre y pagos')).toBeInTheDocument()
    expect(screen.getByText('Alertas operativas')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: /Cargando/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('presents the response-generated timestamp (generado_en)', () => {
    renderContent()

    expect(screen.getByText(/Datos generados:/)).toBeInTheDocument()
  })

  it('presents the response range (rango), derived from the dashboard data', () => {
    renderContent()

    expect(screen.getByText(/Periodo consultado:/)).toBeInTheDocument()
    expect(screen.getByText(/05\/08\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/04\/09\/2026/)).toBeInTheDocument()
  })

  it('does not let the edited filter values silently replace the returned response range', () => {
    // Deliberately different from CAPTAIN_DASHBOARD_FIXTURE.rango
    // (2026-08-05 .. 2026-09-04) so the two can never be confused.
    renderContent({ filters: { fechaDesde: '2030-01-01', fechaHasta: '2030-01-31' } })

    expect(screen.getByText(/Periodo consultado:/)).toBeInTheDocument()
    expect(screen.getByText(/05\/08\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/04\/09\/2026/)).toBeInTheDocument()
    expect(screen.queryByText(/01\/01\/2030/)).not.toBeInTheDocument()
    expect(screen.queryByText(/31\/01\/2030/)).not.toBeInTheDocument()
    // The edited filter values are still shown, but only in the (distinct)
    // date-filter inputs, not folded into the response-range text.
    expect(screen.getByLabelText('Desde')).toHaveValue('2030-01-01')
  })

  it('renders only the loading state when isLoading is true — no stale section content or response metadata', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando panel del capitán' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Resumen de eventos')).not.toBeInTheDocument()
    expect(screen.queryByText(/Periodo consultado:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Datos generados:/)).not.toBeInTheDocument()
  })

  it('renders only the global error state when errorMessage is set — no stale section content or response metadata', () => {
    renderContent({ errorMessage: 'No se pudo cargar el panel.' })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el panel.')
    expect(screen.queryByText('Resumen de eventos')).not.toBeInTheDocument()
    expect(screen.queryByText(/Periodo consultado:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Datos generados:/)).not.toBeInTheDocument()
  })

  it('invokes onRetry from the global error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Error.', onRetry })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders every section as a valid empty/zero state, not "No disponible", for the empty fixture', () => {
    renderContent({ dashboard: EMPTY_CAPTAIN_DASHBOARD_FIXTURE })

    expect(
      screen.getByText('No hay próximos eventos en el rango seleccionado.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No hay eventos con riesgo de personal.')).toBeInTheDocument()
    expect(screen.getByText('No hay ningún evento en curso.')).toBeInTheDocument()
    expect(screen.getByText('Sin alertas.')).toBeInTheDocument()
    expect(screen.queryAllByText('No disponible.')).toHaveLength(0)
  })

  it('shows the SGEB-0004 partial-success warning without hiding the available sections or response metadata', () => {
    renderContent({ isPartial: true })

    expect(
      screen.getByText(
        'Mostramos la información disponible; algunos indicadores no pudieron calcularse.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Resumen de eventos')).toBeInTheDocument()
    expect(screen.getByText(/Periodo consultado:/)).toBeInTheDocument()
    expect(screen.getByText(/Datos generados:/)).toBeInTheDocument()
  })

  it('renders "No disponible" for individual null sections without failing the whole dashboard', () => {
    renderContent({
      dashboard: {
        ...CAPTAIN_DASHBOARD_FIXTURE,
        resumen: null,
        cierre: null,
      },
      isPartial: true,
    })

    expect(screen.getAllByText('No disponible.')).toHaveLength(2)
    expect(screen.getByText('Próximos eventos')).toBeInTheDocument()
    expect(
      screen.queryByRole('alert', { name: /No pudimos cargar/ }),
    ).not.toBeInTheDocument()
  })

  it('does not show the partial warning by default', () => {
    renderContent()

    expect(
      screen.queryByText(/algunos indicadores no pudieron calcularse/),
    ).not.toBeInTheDocument()
  })

  it('always renders the date filters alongside whichever state is active', () => {
    renderContent({ isLoading: true })

    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument()
  })
})
