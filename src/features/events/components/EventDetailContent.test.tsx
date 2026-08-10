import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  EventDetailContent,
  type EventDetailContentProps,
} from '@/features/events/components/EventDetailContent'
import type { EventDetailViewModel } from '@/features/events/types/event'

const EVENTO_CON_COMANDA: EventDetailViewModel = {
  idEvento: 1001,
  titulo: 'Evento de demostración — boda',
  tipo: 'social',
  estado: 'publicado',
  salonNombre: 'Salón Roble',
  fecha: '2026-09-12',
  horaPresentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  cupoMeseros: 12,
  numMesas: 20,
  tarifaPorMesero: 450,
  radioGeocercaM: 150,
  comandaUrl: 'https://files.mediocres.mx/comandas/evento-1001.pdf',
}

const EVENTO_SIN_COMANDA: EventDetailViewModel = {
  idEvento: 1006,
  titulo: 'Evento de demostración — conferencia en curso',
  tipo: 'empresarial',
  estado: 'en_curso',
  salonNombre: 'Salón Alameda',
  fecha: '2026-07-25',
  horaPresentacion: '09:00',
  inicio: '2026-07-25T10:00:00',
  cupoMeseros: 18,
  numMesas: 22,
  tarifaPorMesero: 460,
  radioGeocercaM: 130,
}

function renderContent(props: EventDetailContentProps) {
  return render(
    <MemoryRouter>
      <EventDetailContent {...props} />
    </MemoryRouter>,
  )
}

describe('EventDetailContent — populated state', () => {
  it('renders exactly one h2 event title, with status and type as visible text', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    expect(
      screen.getAllByRole('heading', { level: 2, name: EVENTO_CON_COMANDA.titulo }),
    ).toHaveLength(1)
    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByText('Social')).toBeInTheDocument()
  })

  it('renders salón, date, presentation time, and start date/time', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    expect(screen.getByText('Salón Roble')).toBeInTheDocument()
    expect(screen.getByText('12/09/2026')).toBeInTheDocument()
    expect(screen.getByText('16:00')).toBeInTheDocument()
    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0)
  })

  it('renders waiter capacity, table count, MXN-formatted rate, and geofence radius', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText(/\$/)).toBeInTheDocument()
    expect(screen.getByText('150 m')).toBeInTheDocument()
  })

  it('never displays a raw captain UUID or any technical backend identifier', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    )
    expect(
      screen.queryByText(String(EVENTO_CON_COMANDA.idEvento)),
    ).not.toBeInTheDocument()
  })

  it('provides a real link back to /eventos', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    expect(screen.getByRole('link', { name: /Volver a eventos/ })).toHaveAttribute(
      'href',
      '/eventos',
    )
  })
})

describe('EventDetailContent — comanda', () => {
  it('renders a safe, valid comanda link when comandaUrl is present', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    const link = screen.getByRole('link', { name: /Abrir comanda/ })
    expect(link).toHaveAttribute('href', EVENTO_CON_COMANDA.comandaUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('renders no clickable comanda link when comandaUrl is absent', () => {
    renderContent({ evento: EVENTO_SIN_COMANDA })

    expect(screen.queryByRole('link', { name: /Abrir comanda/ })).not.toBeInTheDocument()
    expect(
      screen.getByText('No hay una comanda disponible para este evento.'),
    ).toBeInTheDocument()
  })

  it('rejects an unsafe comanda URL and renders no clickable link', () => {
    renderContent({
      evento: { ...EVENTO_CON_COMANDA, comandaUrl: 'javascript:alert(1)' },
    })

    expect(screen.queryByRole('link', { name: /Abrir comanda/ })).not.toBeInTheDocument()
  })
})

describe('EventDetailContent — operation roadmap', () => {
  it('shows the still-pending operation labels as non-interactive entries', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    for (const label of ['Bebidas y Cubaitor', 'Cierre', 'Pagos']) {
      const item = screen.getByText(label)
      expect(item).toBeInTheDocument()
      expect(item.closest('[aria-disabled="true"]')).not.toBeNull()
    }

    expect(screen.getAllByText('Próximamente').length).toBe(3)
  })

  it('"Selección de equipo" is a real link to /eventos/{id}/equipo', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    const link = screen.getByRole('link', { name: 'Selección de equipo' })
    expect(link).toHaveAttribute(
      'href',
      `/eventos/${String(EVENTO_CON_COMANDA.idEvento)}/equipo`,
    )
    expect(link.closest('[aria-disabled="true"]')).toBeNull()
  })

  it('"Pase de lista" is a real link to /eventos/{id}/pase-de-lista', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    const link = screen.getByRole('link', { name: 'Pase de lista' })
    expect(link).toHaveAttribute(
      'href',
      `/eventos/${String(EVENTO_CON_COMANDA.idEvento)}/pase-de-lista`,
    )
    expect(link.closest('[aria-disabled="true"]')).toBeNull()
  })

  it('"Montaje / asignación de mesas" is a real link to /eventos/{id}/montaje', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    const link = screen.getByRole('link', { name: 'Montaje / asignación de mesas' })
    expect(link).toHaveAttribute(
      'href',
      `/eventos/${String(EVENTO_CON_COMANDA.idEvento)}/montaje`,
    )
    expect(link.closest('[aria-disabled="true"]')).toBeNull()
  })

  it('exposes no working navigation for the still-pending roadmap entries', () => {
    renderContent({ evento: EVENTO_CON_COMANDA })

    for (const label of ['Bebidas y Cubaitor', 'Cierre', 'Pagos']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
    }
    const hrefHash = document.querySelectorAll('a[href="#"]')
    expect(hrefHash.length).toBe(0)
  })
})

describe('EventDetailContent — loading / error / unavailable', () => {
  it('renders exactly the loading state when isLoading is true', () => {
    renderContent({ evento: null, isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando detalle del evento' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByText('No encontramos el evento solicitado.'),
    ).not.toBeInTheDocument()
  })

  it('renders the error state (taking priority over evento) with an injected retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({
      evento: EVENTO_CON_COMANDA,
      errorMessage: 'Ocurrió un problema inesperado.',
      onRetry,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
    expect(screen.queryByText(EVENTO_CON_COMANDA.titulo)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('does not render a retry action when onRetry is not supplied', () => {
    renderContent({ evento: null, errorMessage: 'Error.' })

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('renders the unavailable state when evento is null and there is no loading/error', () => {
    renderContent({ evento: null })

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a eventos' })).toHaveAttribute(
      'href',
      '/eventos',
    )
  })

  it('never renders technical backend error details in the unavailable or error states', () => {
    renderContent({ evento: null, errorMessage: 'No pudimos cargar el evento.' })

    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(/TypeError|ReferenceError|stack|technical_message/i)
  })

  it('states are mutually exclusive — loading takes priority over error and evento', () => {
    renderContent({
      evento: EVENTO_CON_COMANDA,
      isLoading: true,
      errorMessage: 'Error.',
    })

    expect(
      screen.getByRole('status', { name: 'Cargando detalle del evento' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(EVENTO_CON_COMANDA.titulo)).not.toBeInTheDocument()
  })
})
