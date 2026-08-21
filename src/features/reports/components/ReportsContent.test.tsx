import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  ReportsContent,
  type ReportsContentProps,
} from '@/features/reports/components/ReportsContent'
import type { EventListItemViewModel } from '@/features/events/types/event'

const EVENTO: EventListItemViewModel = {
  idEvento: 1001,
  idSalon: 1,
  capitan: {
    uuidUsuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellidoPaterno: 'Prueba',
    apellidoMaterno: null,
    correo: 'capitan.prueba@example.com',
  },
  titulo: 'Boda Pérez',
  tipo: 'social',
  fecha: '2026-09-12',
  horaPresentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupoMeseros: 10,
  numMesas: 20,
  tarifaPorMesero: 350,
  radioGeocercaM: 150,
  estado: 'en_curso',
  creadoEn: '2026-08-01T00:00:00Z',
}

const OTRO_EVENTO: EventListItemViewModel = {
  ...EVENTO,
  idEvento: 2002,
  titulo: 'Aniversario Gómez',
  fecha: '2026-10-01',
}

function renderContent(props: Partial<ReportsContentProps> = {}) {
  return render(
    <MemoryRouter>
      <ReportsContent
        events={[EVENTO, OTRO_EVENTO]}
        isLoadingEvents={false}
        onRetryEvents={vi.fn()}
        idEvento={1001}
        onEventoChange={vi.fn()}
        canViewRatings={true}
        mermaSummary={{ reportesCount: 2, costoTotal: 470, piezasSinCostear: 1 }}
        isLoadingMerma={false}
        onRetryMerma={vi.fn()}
        ratingsSummary={{ calificaciones: [], total: 0, promedio: null }}
        soloBajas={false}
        onSoloBajasChange={vi.fn()}
        isLoadingRatings={false}
        onRetryRatings={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('ReportsContent — information architecture: two separate scopes', () => {
  it('renders "Reportes por evento" and "Histórico de personal" as two distinct labeled regions', () => {
    renderContent()
    expect(
      screen.getByRole('region', { name: 'Reportes por evento' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Histórico de personal' }),
    ).toBeInTheDocument()
  })

  it('keeps the event picker and every event-scoped card inside "Reportes por evento" only', () => {
    renderContent()
    const eventScope = screen.getByRole('region', { name: 'Reportes por evento' })

    expect(
      within(eventScope).getByRole('combobox', { name: 'Evento' }),
    ).toBeInTheDocument()
    expect(within(eventScope).getByText('Merma')).toBeInTheDocument()
    expect(within(eventScope).getByText('Calificaciones')).toBeInTheDocument()
    expect(within(eventScope).getByText('Pagos')).toBeInTheDocument()
  })

  it('places the deferred waiter-performance card outside "Reportes por evento", inside "Histórico de personal" only', () => {
    renderContent()
    const eventScope = screen.getByRole('region', { name: 'Reportes por evento' })
    const personnelScope = screen.getByRole('region', { name: 'Histórico de personal' })

    expect(within(eventScope).queryByText('Desempeño de meseros')).not.toBeInTheDocument()
    expect(within(personnelScope).getByText('Desempeño de meseros')).toBeInTheDocument()
  })

  it('never implies the selected event scopes the waiter-performance report — no event context text appears in that section', () => {
    renderContent({ idEvento: 1001 })
    const personnelScope = screen.getByRole('region', { name: 'Histórico de personal' })

    expect(within(personnelScope).queryByText(/Boda Pérez/)).not.toBeInTheDocument()
    expect(
      within(personnelScope).queryByText(/Mostrando reportes de/),
    ).not.toBeInTheDocument()
  })

  it('renders no date-range or waiter filter controls anywhere — the backend does not support that report yet', () => {
    const { container } = renderContent()
    // Only the real "Evento" combobox and "solo bajas" checkbox exist —
    // no date/text input of any kind, and no second combobox that could
    // be a waiter selector.
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(0)
    expect(container.querySelectorAll('input[type="text"]')).toHaveLength(0)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })
})

describe('ReportsContent — event selection scopes the event-report section', () => {
  it('shows a "Mostrando reportes de" context line naming the selected event once one is chosen', () => {
    renderContent({ idEvento: 1001 })
    expect(screen.getByText(/Mostrando reportes de: Boda Pérez/)).toBeInTheDocument()
  })

  it('prompts the user to select an event before showing any event-scoped card', () => {
    renderContent({ idEvento: null })
    expect(
      screen.getByText('Selecciona un evento para ver sus reportes.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Merma')).not.toBeInTheDocument()
    expect(screen.queryByText('Pagos')).not.toBeInTheDocument()
  })

  it('still shows the deferred waiter-performance card even when no event is selected', () => {
    renderContent({ idEvento: null })
    expect(screen.getByText('Desempeño de meseros')).toBeInTheDocument()
  })
})

describe('ReportsContent — role gate on calificaciones', () => {
  it('renders the ratings section for a capitán/admin session', () => {
    renderContent({ canViewRatings: true })
    expect(screen.getByText('Calificaciones')).toBeInTheDocument()
  })

  it('renders an honest role-restricted message instead of fetching for a mesero session', () => {
    renderContent({ canViewRatings: false })
    expect(
      screen.getByText('Esta sección es para capitanes y administradores.'),
    ).toBeInTheDocument()
  })
})

describe('ReportsContent — honest scope', () => {
  it('always shows the deferred waiter-performance card, never a fabricated report', () => {
    renderContent()
    expect(screen.getByText('Desempeño de meseros')).toBeInTheDocument()
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
  })

  it('describes the intended future capability concisely', () => {
    renderContent()
    expect(
      screen.getByText(
        'Histórico por periodo de asistencia, calificaciones y pagos por mesero.',
      ),
    ).toBeInTheDocument()
  })

  it('links to the real Payments screen instead of duplicating payment data', () => {
    renderContent()
    expect(screen.getByRole('link', { name: 'Ver pagos del evento' })).toHaveAttribute(
      'href',
      '/eventos/1001/pagos',
    )
  })

  it('links to the real Closure screen for merma detail', () => {
    renderContent()
    expect(screen.getByRole('link', { name: 'Ver detalle en Cierre' })).toHaveAttribute(
      'href',
      '/eventos/1001/cierre',
    )
  })
})
