import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { WaitersFilters } from '@/features/waiters/components/WaitersFilters'
import {
  DEFAULT_WAITERS_FILTER_STATE,
  type WaitersFilterState,
} from '@/features/waiters/types/waiter'

/**
 * `WaitersFilters` is a controlled component — typing into "Buscar" only
 * shows more than one real character if the caller actually re-renders
 * with the updated `filters.search` between keystrokes, exactly like the
 * real `WaitersPage` does. A static `filters` prop would make every
 * keystroke reset the field back to its original value.
 */
function ControlledWaitersFilters({
  onFilterChange,
}: {
  onFilterChange: (filters: WaitersFilterState) => void
}) {
  const [filters, setFilters] = useState(DEFAULT_WAITERS_FILTER_STATE)
  return (
    <WaitersFilters
      filters={filters}
      onFilterChange={(next) => {
        setFilters(next)
        onFilterChange(next)
      }}
    />
  )
}

describe('WaitersFilters', () => {
  it('renders the two real, server-backed filters: search (q) and estado de cuenta (activo)', () => {
    render(
      <WaitersFilters filters={DEFAULT_WAITERS_FILTER_STATE} onFilterChange={vi.fn()} />,
    )

    expect(screen.getByLabelText('Buscar')).toBeInTheDocument()
    expect(screen.getByLabelText('Estado de cuenta')).toBeInTheDocument()
  })

  it('invokes onFilterChange with the updated search text', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(<ControlledWaitersFilters onFilterChange={onFilterChange} />)

    await user.type(screen.getByLabelText('Buscar'), 'Juana')

    expect(onFilterChange).toHaveBeenLastCalledWith({
      ...DEFAULT_WAITERS_FILTER_STATE,
      search: 'Juana',
    })
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
        filters={{ estadoCuenta: 'inactivo', search: 'algo' }}
        onFilterChange={onFilterChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(onFilterChange).toHaveBeenCalledWith(DEFAULT_WAITERS_FILTER_STATE)
  })
})
