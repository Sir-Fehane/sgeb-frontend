import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  EventsContent,
  type EventsContentProps,
} from '@/features/events/components/EventsContent'
import {
  EVENTOS_FIXTURE,
  SALON_OPTIONS_FIXTURE,
} from '@/features/events/fixtures/eventFixtures'
import { DEFAULT_EVENTS_FILTER_STATE } from '@/features/events/types/event'

function renderContent(overrides: Partial<EventsContentProps> = {}) {
  const onFilterChange = overrides.onFilterChange ?? vi.fn()
  render(
    <MemoryRouter>
      <EventsContent
        events={EVENTOS_FIXTURE}
        filters={DEFAULT_EVENTS_FILTER_STATE}
        onFilterChange={onFilterChange}
        salones={SALON_OPTIONS_FIXTURE}
        {...overrides}
      />
    </MemoryRouter>,
  )
  return { onFilterChange }
}

describe('EventsContent', () => {
  it('renders the populated list when events is non-empty and isLoading/errorMessage are absent', () => {
    renderContent()

    const first = EVENTOS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture event')
    }
    expect(screen.getByText(first.titulo)).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Cargando eventos' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the loading state when isLoading is true, regardless of events', () => {
    renderContent({ isLoading: true })

    expect(screen.getByRole('status', { name: 'Cargando eventos' })).toBeInTheDocument()
    expect(screen.queryByText(EVENTOS_FIXTURE[0]?.titulo ?? '')).not.toBeInTheDocument()
  })

  it('renders the error state (with retry) when errorMessage is set, taking priority over events', () => {
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
    expect(screen.queryByText(EVENTOS_FIXTURE[0]?.titulo ?? '')).not.toBeInTheDocument()
  })

  it('invokes onRetry from the error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Error.', onRetry })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders the empty state when events is empty and isLoading/errorMessage are absent', () => {
    renderContent({ events: [] })

    expect(
      screen.getByText('No hay eventos que coincidan con los filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('always renders the header and filters alongside whichever state is active', () => {
    renderContent({ isLoading: true, onCreate: vi.fn() })

    expect(screen.getByLabelText('Estado')).toBeInTheDocument()
    expect(screen.getByLabelText('Salón')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear evento' })).toBeInTheDocument()
  })
})
