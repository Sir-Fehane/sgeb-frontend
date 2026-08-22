import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaiterPerformanceFilters } from '@/features/reports/components/WaiterPerformanceFilters'
import type { WaiterPerformanceFilterState } from '@/features/reports/types/report'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

const WAITER: WaiterListItemViewModel = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  nombreCompleto: 'Juan Pérez',
  correo: 'juan.perez@example.com',
  telefono: null,
  estadoCuenta: 'activo',
}

const DEFAULT_FILTERS: WaiterPerformanceFilterState = {
  fechaDesde: '2026-08-01',
  fechaHasta: '2026-08-31',
  uuidMesero: null,
}

describe('WaiterPerformanceFilters', () => {
  it('renders labeled Desde/Hasta date inputs and a Mesero select defaulting to "Todos los meseros"', () => {
    render(
      <WaiterPerformanceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={vi.fn()}
        waiters={[WAITER]}
      />,
    )

    expect(screen.getByLabelText(/^Desde/)).toHaveValue('2026-08-01')
    expect(screen.getByLabelText(/^Hasta/)).toHaveValue('2026-08-31')
    expect(screen.getByRole('combobox', { name: 'Mesero' })).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Todos los meseros' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Juan Pérez' })).toBeInTheDocument()
  })

  it('reports a changed Desde date without mutating other fields', () => {
    const onFilterChange = vi.fn()
    render(
      <WaiterPerformanceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={onFilterChange}
        waiters={[WAITER]}
      />,
    )

    const input = screen.getByLabelText(/^Desde/)
    fireEvent.change(input, { target: { value: '2026-08-05' } })

    const lastCall = onFilterChange.mock.calls.at(-1)?.[0] as WaiterPerformanceFilterState
    expect(lastCall.fechaDesde).toBe('2026-08-05')
    expect(lastCall.fechaHasta).toBe('2026-08-31')
    expect(lastCall.uuidMesero).toBeNull()
  })

  it('selects a specific mesero by uuid', async () => {
    const onFilterChange = vi.fn()
    render(
      <WaiterPerformanceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={onFilterChange}
        waiters={[WAITER]}
      />,
    )

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Mesero' }),
      WAITER.id,
    )

    expect(onFilterChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      uuidMesero: WAITER.id,
    })
  })

  it('returning to "Todos los meseros" reports uuidMesero as null, never an empty string', async () => {
    const onFilterChange = vi.fn()
    render(
      <WaiterPerformanceFilters
        filters={{ ...DEFAULT_FILTERS, uuidMesero: WAITER.id }}
        onFilterChange={onFilterChange}
        waiters={[WAITER]}
      />,
    )

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Mesero' }), '')

    expect(onFilterChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, uuidMesero: null })
  })

  it('shows an inline error on Hasta when the range is invalid, mirroring the backend’s own message', () => {
    render(
      <WaiterPerformanceFilters
        filters={{ fechaDesde: '2026-08-31', fechaHasta: '2026-08-01', uuidMesero: null }}
        onFilterChange={vi.fn()}
        waiters={[WAITER]}
      />,
    )

    expect(
      screen.getByText('El rango de fechas de búsqueda no es válido.'),
    ).toBeInTheDocument()
  })
})
