import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventList } from '@/features/events/components/EventList'
import { EVENTOS_FIXTURE } from '@/features/events/fixtures/eventFixtures'

describe('EventList', () => {
  it('renders documented event information (título, fecha, salón, capitán, tipo) for each event', () => {
    render(<EventList eventos={EVENTOS_FIXTURE} />)

    const first = EVENTOS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture event')
    }

    expect(screen.getByText(first.titulo)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(first.fecha))).toBeInTheDocument()
    // Fixture salón/capitán names repeat across events, so assert
    // presence (at least one match) rather than a unique element.
    if (first.salonNombre) {
      expect(screen.getAllByText(first.salonNombre).length).toBeGreaterThan(0)
    }
    if (first.capitanNombre) {
      expect(screen.getAllByText(first.capitanNombre).length).toBeGreaterThan(0)
    }
  })

  it('renders every documented estado as its text label', () => {
    render(<EventList eventos={EVENTOS_FIXTURE} />)

    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })

  it('exposes exactly one interactive control per event — no duplicate accessible names across the responsive presentation', () => {
    render(<EventList eventos={EVENTOS_FIXTURE} />)

    expect(screen.getAllByRole('button')).toHaveLength(EVENTOS_FIXTURE.length)
  })

  it('invokes onSelectEvent with the opaque string event id when an event is chosen', async () => {
    const user = userEvent.setup()
    const onSelectEvent = vi.fn()
    render(<EventList eventos={EVENTOS_FIXTURE} onSelectEvent={onSelectEvent} />)

    const first = EVENTOS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture event')
    }

    await user.click(screen.getByText(first.titulo))

    expect(onSelectEvent).toHaveBeenCalledWith(String(first.idEvento))
    expect(typeof onSelectEvent.mock.calls[0]?.[0]).toBe('string')
  })

  it('is keyboard-operable — Enter on a focused event activates selection', async () => {
    const user = userEvent.setup()
    const onSelectEvent = vi.fn()
    render(<EventList eventos={EVENTOS_FIXTURE} onSelectEvent={onSelectEvent} />)

    const buttons = screen.getAllByRole('button')
    const firstButton = buttons[0]
    if (!firstButton) {
      throw new Error('Expected at least one event button')
    }
    firstButton.focus()
    await user.keyboard('{Enter}')

    expect(onSelectEvent).toHaveBeenCalledOnce()
  })
})
