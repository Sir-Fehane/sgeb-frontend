import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaitersFilters } from '@/features/waiters/components/WaitersFilters'
import { DEFAULT_WAITERS_FILTER_STATE } from '@/features/waiters/types/waiter'

describe('WaitersFilters', () => {
  it('renders exactly the one documented filter (estado de cuenta) and no others', () => {
    render(
      <WaitersFilters filters={DEFAULT_WAITERS_FILTER_STATE} onFilterChange={vi.fn()} />,
    )

    expect(screen.getByLabelText('Estado de cuenta')).toBeInTheDocument()

    // No undocumented filter — no text search, invitation status,
    // availability, or event-assignment filter is documented.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/buscar/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/invitaci[oó]n/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/disponibilidad/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/evento/i)).not.toBeInTheDocument()
  })

  it('invokes onFilterChange with the updated estadoCuenta when changed', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <WaitersFilters
        filters={DEFAULT_WAITERS_FILTER_STATE}
        onFilterChange={onFilterChange}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Estado de cuenta'), 'inactivo')

    expect(onFilterChange).toHaveBeenCalledWith({
      ...DEFAULT_WAITERS_FILTER_STATE,
      estadoCuenta: 'inactivo',
    })
  })

  it('resets to the default filter state via "Limpiar filtros"', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <WaitersFilters
        filters={{ estadoCuenta: 'inactivo' }}
        onFilterChange={onFilterChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(onFilterChange).toHaveBeenCalledWith(DEFAULT_WAITERS_FILTER_STATE)
  })
})
