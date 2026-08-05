import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UpcomingEventItem } from '@/features/dashboard/components/UpcomingEventItem'
import type { UpcomingEventViewModel } from '@/features/dashboard/types/dashboard'

const EVENT: UpcomingEventViewModel = {
  idEvento: 'dashboard-evento-demo-1',
  titulo: 'Evento de demostración — boda',
  fecha: '2026-08-12',
  horaPresentacion: '16:00',
  salon: 'Salón Roble',
  estado: 'publicado',
  cupoMeseros: 12,
  confirmados: 10,
  porcentajeCobertura: 83.3,
}

describe('UpcomingEventItem', () => {
  it('renders as a non-interactive item (no button, no link) when no onSelect is supplied', () => {
    render(
      <ul>
        <UpcomingEventItem event={EVENT} />
      </ul>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(EVENT.titulo)).toBeInTheDocument()
  })

  it('renders as a keyboard-operable button and invokes onSelect with the opaque id when supplied', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ul>
        <UpcomingEventItem event={EVENT} onSelect={onSelect} />
      </ul>,
    )

    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(EVENT.idEvento)
  })

  it('never renders the opaque id as visible text', () => {
    render(
      <ul>
        <UpcomingEventItem event={EVENT} />
      </ul>,
    )

    expect(screen.queryByText(EVENT.idEvento)).not.toBeInTheDocument()
  })

  it('renders the documented fields: estado as text, and the exact coverage percentage', () => {
    render(
      <ul>
        <UpcomingEventItem event={EVENT} />
      </ul>,
    )

    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByText('83.3%')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
