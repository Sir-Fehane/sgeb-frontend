import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UpcomingEventsSection } from '@/features/dashboard/components/UpcomingEventsSection'
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

describe('UpcomingEventsSection', () => {
  it('renders "No disponible" when proximosEventos is null', () => {
    render(<UpcomingEventsSection proximosEventos={null} />)

    expect(screen.getByText('No disponible.')).toBeInTheDocument()
  })

  it('renders the empty-list message when proximosEventos is an empty array', () => {
    render(<UpcomingEventsSection proximosEventos={[]} />)

    expect(
      screen.getByText('No hay próximos eventos en el rango seleccionado.'),
    ).toBeInTheDocument()
  })

  it('renders populated events as static rows by default (no onSelect supplied)', () => {
    render(<UpcomingEventsSection proximosEventos={[EVENT]} />)

    expect(screen.getByText(EVENT.titulo)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders populated events as interactive rows when onSelectEvent is supplied', () => {
    render(<UpcomingEventsSection proximosEventos={[EVENT]} onSelectEvent={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: new RegExp(EVENT.titulo) }),
    ).toBeInTheDocument()
  })
})
