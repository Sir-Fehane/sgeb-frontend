import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventsFilters } from '@/features/events/components/EventsFilters'
import { SALON_OPTIONS_FIXTURE } from '@/features/events/fixtures/eventFixtures'
import { DEFAULT_EVENTS_FILTER_STATE } from '@/features/events/types/event'

describe('EventsFilters', () => {
  it('renders exactly the four documented filters (estado, salón, desde, hasta) and no others', () => {
    render(
      <EventsFilters
        filters={DEFAULT_EVENTS_FILTER_STATE}
        onFilterChange={vi.fn()}
        salones={SALON_OPTIONS_FIXTURE}
      />,
    )

    expect(screen.getByLabelText('Estado')).toBeInTheDocument()
    expect(screen.getByLabelText('Salón')).toBeInTheDocument()
    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument()

    // No undocumented filter — in particular, no free-text search field.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/buscar/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/capit[aá]n/i)).not.toBeInTheDocument()
  })

  it('invokes onFilterChange with the updated estado when changed', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <EventsFilters
        filters={DEFAULT_EVENTS_FILTER_STATE}
        onFilterChange={onFilterChange}
        salones={SALON_OPTIONS_FIXTURE}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Estado'), 'cancelado')

    expect(onFilterChange).toHaveBeenCalledWith({
      ...DEFAULT_EVENTS_FILTER_STATE,
      estado: 'cancelado',
    })
  })

  it('invokes onFilterChange with a numeric idSalon when a salón is chosen', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <EventsFilters
        filters={DEFAULT_EVENTS_FILTER_STATE}
        onFilterChange={onFilterChange}
        salones={SALON_OPTIONS_FIXTURE}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Salón'), '1')

    expect(onFilterChange).toHaveBeenCalledWith({
      ...DEFAULT_EVENTS_FILTER_STATE,
      idSalon: 1,
    })
  })

  it('resets to the default filter state via "Limpiar filtros"', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <EventsFilters
        filters={{ ...DEFAULT_EVENTS_FILTER_STATE, estado: 'cancelado', idSalon: 1 }}
        onFilterChange={onFilterChange}
        salones={SALON_OPTIONS_FIXTURE}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(onFilterChange).toHaveBeenCalledWith(DEFAULT_EVENTS_FILTER_STATE)
  })
})
