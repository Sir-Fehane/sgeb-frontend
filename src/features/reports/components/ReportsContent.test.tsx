import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  ReportsContent,
  type ReportsContentProps,
} from '@/features/reports/components/ReportsContent'
import type { WaiterPerformanceSectionProps } from '@/features/reports/components/WaiterPerformanceSection'
import type { WaiterPerformanceRowViewModel } from '@/features/reports/types/report'
import type { EventListItemViewModel } from '@/features/events/types/event'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

const EVENTO: EventListItemViewModel = {
  idEvento: 1001,
  idSalon: 1,
  capitan: {
    uuidUsuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellidoPaterno: 'Prueba',
    apellidoMaterno: null,
    correo: 'capitan.prueba@example.com',
  },
  titulo: 'Boda Pérez',
  tipo: 'social',
  fecha: '2026-09-12',
  horaPresentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupoMeseros: 10,
  numMesas: 20,
  tarifaPorMesero: 350,
  radioGeocercaM: 150,
  estado: 'en_curso',
  creadoEn: '2026-08-01T00:00:00Z',
}

const OTRO_EVENTO: EventListItemViewModel = {
  ...EVENTO,
  idEvento: 2002,
  titulo: 'Aniversario Gómez',
  fecha: '2026-10-01',
}

const WAITER: WaiterListItemViewModel = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  nombreCompleto: 'Juan Pérez',
  correo: 'juan.perez@example.com',
  telefono: null,
  estadoCuenta: 'activo',
}

const WAITER_PERFORMANCE_ROW: WaiterPerformanceRowViewModel = {
  uuidUsuario: WAITER.id,
  nombreCompleto: WAITER.nombreCompleto,
  eventosTrabajados: 4,
  asistencias: 3,
  faltas: 1,
  pagosAcumulados: 1200,
  pagosRecibidos: 900,
  porCobrar: 300,
  calificacionesRecibidas: 3,
  promedioCalificacion: 4.5,
  calificacionesBajas: 0,
  solicitudesAtendidas: 10,
  segundosRespuestaPromedio: 90,
}

function defaultWaiterPerformance(
  overrides: Partial<WaiterPerformanceSectionProps> = {},
): WaiterPerformanceSectionProps {
  return {
    canView: true,
    filters: { fechaDesde: '2026-08-01', fechaHasta: '2026-08-31', uuidMesero: null },
    onFiltersChange: vi.fn(),
    onPageChange: vi.fn(),
    waiters: [WAITER],
    data: {
      items: [WAITER_PERFORMANCE_ROW],
      meta: {
        page: 1,
        pageSize: 25,
        total: 1,
        lastPage: 1,
        periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
      },
    },
    isLoading: false,
    onRetry: vi.fn(),
    ...overrides,
  }
}

function renderContent(props: Partial<ReportsContentProps> = {}) {
  return render(
    <MemoryRouter>
      <ReportsContent
        events={[EVENTO, OTRO_EVENTO]}
        isLoadingEvents={false}
        onRetryEvents={vi.fn()}
        idEvento={1001}
        onEventoChange={vi.fn()}
        canViewRatings={true}
        mermaSummary={{ reportesCount: 2, costoTotal: 470, piezasSinCostear: 1 }}
        isLoadingMerma={false}
        onRetryMerma={vi.fn()}
        ratingsSummary={{ calificaciones: [], total: 0, promedio: null }}
        soloBajas={false}
        onSoloBajasChange={vi.fn()}
        isLoadingRatings={false}
        onRetryRatings={vi.fn()}
        waiterPerformance={defaultWaiterPerformance()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('ReportsContent — information architecture: two separate scopes', () => {
  it('renders "Reportes por evento" and "Histórico de personal" as two distinct labeled regions', () => {
    renderContent()
    expect(
      screen.getByRole('region', { name: 'Reportes por evento' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Histórico de personal' }),
    ).toBeInTheDocument()
  })

  it('keeps the event picker and every event-scoped card inside "Reportes por evento" only', () => {
    renderContent()
    const eventScope = screen.getByRole('region', { name: 'Reportes por evento' })

    expect(
      within(eventScope).getByRole('combobox', { name: 'Evento' }),
    ).toBeInTheDocument()
    expect(within(eventScope).getByText('Merma')).toBeInTheDocument()
    expect(within(eventScope).getByText('Calificaciones')).toBeInTheDocument()
    expect(within(eventScope).getByText('Pagos')).toBeInTheDocument()
  })

  it('places the waiter-performance report outside "Reportes por evento", inside "Histórico de personal" only', () => {
    renderContent()
    const eventScope = screen.getByRole('region', { name: 'Reportes por evento' })
    const personnelScope = screen.getByRole('region', { name: 'Histórico de personal' })

    expect(within(eventScope).queryByText('Desempeño de meseros')).not.toBeInTheDocument()
    expect(within(personnelScope).getByText('Desempeño de meseros')).toBeInTheDocument()
  })

  it('never implies the selected event scopes the waiter-performance report — no event context text appears in that section', () => {
    renderContent({ idEvento: 1001 })
    const personnelScope = screen.getByRole('region', { name: 'Histórico de personal' })

    expect(within(personnelScope).queryByText(/Boda Pérez/)).not.toBeInTheDocument()
    expect(
      within(personnelScope).queryByText(/Mostrando reportes de/),
    ).not.toBeInTheDocument()
  })

  it('renders exactly the real filter controls: Evento (event scope) and Desde/Hasta/Mesero (personnel scope)', () => {
    const { container } = renderContent()
    const eventScope = screen.getByRole('region', { name: 'Reportes por evento' })
    const personnelScope = screen.getByRole('region', { name: 'Histórico de personal' })

    expect(
      within(eventScope).getByRole('combobox', { name: 'Evento' }),
    ).toBeInTheDocument()
    expect(
      within(personnelScope).getByRole('combobox', { name: 'Mesero' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(2)
  })

  it('does not change the historical report when a different event is selected — its filters/query are independent of idEvento', () => {
    const onFiltersChange = vi.fn()
    const { rerender } = renderContent({
      idEvento: 1001,
      waiterPerformance: defaultWaiterPerformance({ onFiltersChange }),
    })

    rerender(
      <MemoryRouter>
        <ReportsContent
          events={[EVENTO, OTRO_EVENTO]}
          isLoadingEvents={false}
          onRetryEvents={vi.fn()}
          idEvento={2002}
          onEventoChange={vi.fn()}
          canViewRatings={true}
          mermaSummary={{ reportesCount: 2, costoTotal: 470, piezasSinCostear: 1 }}
          isLoadingMerma={false}
          onRetryMerma={vi.fn()}
          ratingsSummary={{ calificaciones: [], total: 0, promedio: null }}
          soloBajas={false}
          onSoloBajasChange={vi.fn()}
          isLoadingRatings={false}
          onRetryRatings={vi.fn()}
          waiterPerformance={defaultWaiterPerformance({ onFiltersChange })}
        />
      </MemoryRouter>,
    )

    expect(onFiltersChange).not.toHaveBeenCalled()
    expect(
      screen.getByText('Del 01/08/2026 al 31/08/2026 · Todos los meseros'),
    ).toBeInTheDocument()
  })
})

describe('ReportsContent — event selection scopes the event-report section', () => {
  it('shows a "Mostrando reportes de" context line naming the selected event once one is chosen', () => {
    renderContent({ idEvento: 1001 })
    expect(screen.getByText(/Mostrando reportes de: Boda Pérez/)).toBeInTheDocument()
  })

  it('prompts the user to select an event before showing any event-scoped card', () => {
    renderContent({ idEvento: null })
    const eventScope = screen.getByRole('region', { name: 'Reportes por evento' })
    expect(
      screen.getByText('Selecciona un evento para ver sus reportes.'),
    ).toBeInTheDocument()
    expect(within(eventScope).queryByText('Merma')).not.toBeInTheDocument()
    // "Pagos" also appears as a metric-group header inside the always-visible
    // waiter-performance table (`Histórico de personal`) — scoped to the
    // event section so this assertion targets the "Pagos" shortcut card only.
    expect(within(eventScope).queryByText('Pagos')).not.toBeInTheDocument()
  })

  it('still shows the real waiter-performance report even when no event is selected', () => {
    renderContent({ idEvento: null })
    expect(screen.getByText('Desempeño de meseros')).toBeInTheDocument()
  })
})

describe('ReportsContent — role gates', () => {
  it('renders the ratings section for a capitán/admin session', () => {
    renderContent({ canViewRatings: true })
    expect(screen.getByText('Calificaciones')).toBeInTheDocument()
  })

  it('renders an honest role-restricted message instead of fetching ratings for a mesero session', () => {
    renderContent({ canViewRatings: false })
    const eventScope = screen.getByRole('region', { name: 'Reportes por evento' })
    expect(
      within(eventScope).getByText('Esta sección es para capitanes y administradores.'),
    ).toBeInTheDocument()
  })

  it('renders an honest role-restricted message instead of fetching waiter performance for a mesero session', () => {
    renderContent({ waiterPerformance: defaultWaiterPerformance({ canView: false }) })
    const personnelScope = screen.getByRole('region', { name: 'Histórico de personal' })
    expect(
      within(personnelScope).getByText(
        'Esta sección es para capitanes y administradores.',
      ),
    ).toBeInTheDocument()
  })
})

describe('ReportsContent — waiter performance report', () => {
  it('renders real rows, never a fabricated/deferred state', () => {
    renderContent()
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Juan Pérez' })).toBeInTheDocument()
  })

  it('links to the real Payments screen instead of duplicating payment data', () => {
    renderContent()
    expect(screen.getByRole('link', { name: 'Ver pagos del evento' })).toHaveAttribute(
      'href',
      '/eventos/1001/pagos',
    )
  })

  it('links to the real Closure screen for merma detail', () => {
    renderContent()
    expect(screen.getByRole('link', { name: 'Ver detalle en Cierre' })).toHaveAttribute(
      'href',
      '/eventos/1001/cierre',
    )
  })
})
