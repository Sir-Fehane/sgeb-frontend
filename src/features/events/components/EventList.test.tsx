import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { EventList } from '@/features/events/components/EventList'
import { EVENTOS_FIXTURE } from '@/features/events/fixtures/eventFixtures'

function renderList(props: Parameters<typeof EventList>[0]) {
  return render(
    <MemoryRouter>
      <EventList {...props} />
    </MemoryRouter>,
  )
}

describe('EventList', () => {
  it('renders documented event information (título, fecha, salón, capitán, tipo) for each event', () => {
    renderList({ eventos: EVENTOS_FIXTURE })

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
    renderList({ eventos: EVENTOS_FIXTURE })

    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })

  it('exposes exactly two links per event — the main card surface and "Ver detalle" — no button, no duplicate accessible names', () => {
    renderList({ eventos: EVENTOS_FIXTURE })

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getAllByRole('link')).toHaveLength(EVENTOS_FIXTURE.length * 2)
    expect(screen.getAllByRole('link', { name: /^Ver detalle de / })).toHaveLength(
      EVENTOS_FIXTURE.length,
    )
  })

  it('the main card surface navigates to /eventos/{id}, keyboard-operable like any link', () => {
    renderList({ eventos: EVENTOS_FIXTURE })

    const mainLinks = screen.getAllByRole('link', { name: /^Ver detalles de/ })
    expect(mainLinks).toHaveLength(EVENTOS_FIXTURE.length)
    mainLinks.forEach((link, index) => {
      const evento = EVENTOS_FIXTURE[index]
      expect(link).toHaveAttribute('href', `/eventos/${String(evento?.idEvento)}`)
    })
  })

  it('each "Ver detalle" link points to its matching /eventos/{id}, with an accessible name', () => {
    renderList({ eventos: EVENTOS_FIXTURE })

    for (const evento of EVENTOS_FIXTURE) {
      const link = screen.getByRole('link', { name: `Ver detalle de ${evento.titulo}` })
      expect(link).toHaveAttribute('href', `/eventos/${String(evento.idEvento)}`)
    }
  })
})
