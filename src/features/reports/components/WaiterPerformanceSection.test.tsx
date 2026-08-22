import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  WaiterPerformanceSection,
  type WaiterPerformanceSectionProps,
} from '@/features/reports/components/WaiterPerformanceSection'
import type { WaiterPerformanceRowViewModel } from '@/features/reports/types/report'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

const WAITER: WaiterListItemViewModel = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  nombreCompleto: 'Juan Pérez',
  correo: 'juan.perez@example.com',
  telefono: null,
  estadoCuenta: 'activo',
}

const ROW: WaiterPerformanceRowViewModel = {
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

function defaultProps(
  overrides: Partial<WaiterPerformanceSectionProps> = {},
): WaiterPerformanceSectionProps {
  return {
    canView: true,
    filters: { fechaDesde: '2026-08-01', fechaHasta: '2026-08-31', uuidMesero: null },
    onFiltersChange: vi.fn(),
    onPageChange: vi.fn(),
    waiters: [WAITER],
    data: {
      items: [ROW],
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

describe('WaiterPerformanceSection', () => {
  it('renders an honest role-restricted message instead of fetching for a non capitán/admin session', () => {
    render(<WaiterPerformanceSection {...defaultProps({ canView: false })} />)
    expect(
      screen.getByText('Esta sección es para capitanes y administradores.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Mesero' })).not.toBeInTheDocument()
  })

  it('shows a loading state while the report is pending', () => {
    render(
      <WaiterPerformanceSection {...defaultProps({ isLoading: true, data: null })} />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error state with a retry action, not a blank table', () => {
    const onRetry = vi.fn()
    render(
      <WaiterPerformanceSection
        {...defaultProps({
          data: null,
          errorMessage: 'No se pudo cargar el reporte.',
          onRetry,
        })}
      />,
    )
    expect(screen.getByText('No se pudo cargar el reporte.')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Reintentar' }).click()
    expect(onRetry).toHaveBeenCalled()
  })

  it('shows an honest empty state for SGEB-0002, never a red error', () => {
    render(
      <WaiterPerformanceSection
        {...defaultProps({
          data: {
            items: [],
            meta: {
              page: 1,
              pageSize: 25,
              total: 0,
              lastPage: 1,
              periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
            },
          },
        })}
      />,
    )
    expect(
      screen.getByText(/No hay datos de desempeño para este periodo/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the table and pagination together once real rows load', () => {
    render(<WaiterPerformanceSection {...defaultProps()} />)
    expect(screen.getByRole('rowheader', { name: 'Juan Pérez' })).toBeInTheDocument()
    expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument()
  })

  it('shows the period and "Todos los meseros" in the context line by default', () => {
    render(<WaiterPerformanceSection {...defaultProps()} />)
    expect(
      screen.getByText('Del 01/08/2026 al 31/08/2026 · Todos los meseros'),
    ).toBeInTheDocument()
  })

  it('names the selected mesero in the context line instead of "Todos los meseros"', () => {
    render(
      <WaiterPerformanceSection
        {...defaultProps({
          filters: {
            fechaDesde: '2026-08-01',
            fechaHasta: '2026-08-31',
            uuidMesero: WAITER.id,
          },
        })}
      />,
    )
    expect(
      screen.getByText('Del 01/08/2026 al 31/08/2026 · Juan Pérez'),
    ).toBeInTheDocument()
  })
})
