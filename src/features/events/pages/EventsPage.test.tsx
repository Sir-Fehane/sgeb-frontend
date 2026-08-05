import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { EVENTOS_FIXTURE } from '@/features/events/fixtures/eventFixtures'
import { EventsPage } from '@/features/events/pages/EventsPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <EventsPage />
    </MemoryRouter>,
  )
}

describe('EventsPage', () => {
  it('shows the populated list by default, clearly labeled as development data', () => {
    renderPage()

    const first = EVENTOS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture event')
    }
    expect(screen.getByText(first.titulo)).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
  })

  it('does not expose a "Vista de desarrollo" state-switching control', () => {
    renderPage()

    expect(screen.queryByLabelText('Vista de desarrollo')).not.toBeInTheDocument()
    expect(screen.queryByText('Cargando')).not.toBeInTheDocument()
  })

  it("shows the empty state when the user's own filters match zero events — a real, filter-driven outcome", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText('Estado'), 'cancelado')
    await user.selectOptions(screen.getByLabelText('Salón'), '3')

    expect(
      screen.getByText('No hay eventos que coincidan con los filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('shows an honest inline notice instead of navigating when an event is selected', async () => {
    const user = userEvent.setup()
    renderPage()

    const first = EVENTOS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture event')
    }
    await user.click(screen.getByText(first.titulo))

    expect(screen.getByText(/aún no está disponible en esta base/)).toBeInTheDocument()
  })

  it('shows an honest inline notice instead of navigating when "Crear evento" is activated', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(screen.getByText(/no está conectada a una ruta/)).toBeInTheDocument()
  })

  it('applies filters to the visible list', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText('Estado'), 'cancelado')

    const cancelado = EVENTOS_FIXTURE.find((evento) => evento.estado === 'cancelado')
    const publicado = EVENTOS_FIXTURE.find((evento) => evento.estado === 'publicado')
    if (!cancelado || !publicado) {
      throw new Error('Expected both a cancelado and a publicado fixture event')
    }

    expect(screen.getByText(cancelado.titulo)).toBeInTheDocument()
    expect(screen.queryByText(publicado.titulo)).not.toBeInTheDocument()
  })
})
