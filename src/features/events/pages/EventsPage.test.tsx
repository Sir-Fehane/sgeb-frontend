import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EVENTOS_FIXTURE } from '@/features/events/fixtures/eventFixtures'
import { EventsPage } from '@/features/events/pages/EventsPage'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function successEnvelope(data: EventoApiRecord[]) {
  return {
    result: { code: data.length === 0 ? 'SGEB-0002' : 'SGEB-0000', message: 'ok' },
    data,
  }
}

const RECORD_A: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 1,
  titulo: 'Boda García',
  tipo: 'social',
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  radio_geocerca_m: 150,
  estado: 'publicado',
  creado_en: '2026-07-01T09:00:00',
}

const RECORD_B: EventoApiRecord = {
  ...RECORD_A,
  id_evento: 1002,
  titulo: 'Conferencia anual',
  estado: 'cancelado',
}

function renderPage() {
  // `retryDelay: 0` — the hook itself decides whether a given error retries
  // (see `useEventsListQuery`'s own `retry` function); zeroing the delay
  // just keeps this file's network-error test from waiting out the default
  // exponential backoff.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventsPage', () => {
  it('renders the real GET /eventos list, not development fixtures', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A]))

    renderPage()

    expect(await screen.findByText('Boda García')).toBeInTheDocument()
    for (const fixture of EVENTOS_FIXTURE) {
      expect(screen.queryByText(fixture.titulo)).not.toBeInTheDocument()
    }
  })

  it('shows a loading state while the request is pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderPage()

    expect(screen.getByRole('status', { name: 'Cargando eventos' })).toBeInTheDocument()
  })

  it('shows the empty state on SGEB-0002, not an error', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([]))

    renderPage()

    expect(
      await screen.findByText('No hay eventos que coincidan con los filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('shows the safe application error message and never technical_message', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(500, {
        code: 'SGEB-5008',
        message: 'No pudimos completar la operación.',
        technical_message: 'stack trace secreto interno',
      }),
    )

    renderPage()

    expect(
      await screen.findByText('No pudimos completar la operación.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/stack trace secreto interno/)).not.toBeInTheDocument()
  })

  it('shows a network error message distinctly and offers a retry that refetches', async () => {
    // Rejects every call, including the hook's own internal SgebNetworkError
    // retries, until the query settles into its error state — then the mock
    // is swapped so the user-triggered "Reintentar" click succeeds.
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    )

    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A]))
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Boda García')).toBeInTheDocument()
  })

  it('sends estado/fechaDesde/fechaHasta as query params when the estado filter changes, and never id_salon', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A, RECORD_B]))
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Boda García')

    await user.selectOptions(screen.getByLabelText('Estado'), 'cancelado')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenLastCalledWith(
        expect.objectContaining({ url: '/eventos', params: { estado: 'cancelado' } }),
      )
    })
  })

  it('propagates an AbortSignal to the SGEB transport', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A]))

    renderPage()

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalled()
    })
    const config = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(config.signal).toBeInstanceOf(AbortSignal)
  })

  it('renders the salón filter with no fabricated options — only "Todos" is selectable', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A]))

    renderPage()
    await screen.findByText('Boda García')

    const salonSelect = screen.getByLabelText<HTMLSelectElement>('Salón')
    expect(Array.from(salonSelect.options).map((option) => option.value)).toEqual([
      'todos',
    ])
  })

  it('shows an honest inline notice instead of navigating when an event is selected', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A]))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('Boda García'))

    expect(screen.getByText(/aún no está disponible en esta base/)).toBeInTheDocument()
  })

  it('shows an honest inline notice instead of navigating when "Crear evento" is activated', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A]))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(screen.getByText(/no está conectada a una ruta/)).toBeInTheDocument()
  })

  it('renders a "Ver detalle" link to /eventos/{id} for each visible event', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope([RECORD_A]))
    renderPage()

    const link = await screen.findByRole('link', { name: 'Ver detalle de Boda García' })
    expect(link).toHaveAttribute('href', '/eventos/1001')
  })
})
