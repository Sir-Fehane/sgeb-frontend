import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EVENT_DETAIL_FIXTURES } from '@/features/events/fixtures/eventDetailFixtures'
import { EventDetailPage } from '@/features/events/pages/EventDetailPage'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function successEnvelope(data: EventoApiRecord) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

const RECORD: EventoApiRecord = {
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

function renderAt(path: string) {
  // `retryDelay: 0` — the hook decides whether a given error retries (see
  // `useEventDetailQuery`'s own `retry` function); zeroing the delay just
  // keeps the network-error test from waiting out the default backoff.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/eventos/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventDetailPage', () => {
  it('renders the real GET /eventos/{id} detail, not development fixtures', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope(RECORD))

    renderAt('/eventos/1001')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Boda García' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/)).not.toBeInTheDocument()
    for (const fixture of EVENT_DETAIL_FIXTURES) {
      expect(screen.queryByText(fixture.titulo)).not.toBeInTheDocument()
    }
  })

  it('requests GET /eventos/{id} with the exact numeric id from the route', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope(RECORD))

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/eventos/1001' }),
      )
    })
    // Never a mutation: no `method` set means Axios' default GET.
    const config = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(config.method).toBeUndefined()
  })

  it('shows a loading state while the request is pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderAt('/eventos/1001')

    expect(
      screen.getByRole('status', { name: 'Cargando detalle del evento' }),
    ).toBeInTheDocument()
  })

  it('maps documented wire fields and leaves salonNombre/comandaUrl unpopulated (undocumented/unsafe fields)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope(RECORD))

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(screen.getByText('16:00')).toBeInTheDocument()
    expect(screen.getAllByText('Información pendiente de integración')).toHaveLength(1)
    expect(
      screen.getByText('No hay una comanda disponible para este evento.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Abrir comanda/ })).not.toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed route id, without ever calling the transport', () => {
    renderAt('/eventos/not-a-number')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('renders the unavailable state for zero, negative, and decimal ids, without calling the transport', () => {
    for (const badId of ['0', '-5', '10.5']) {
      const { unmount } = renderAt(`/eventos/${badId}`)
      expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
      unmount()
    }
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('renders the unavailable state — not the generic error state — for SGEB-3001 (not found)', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(404, {
        code: 'SGEB-3001',
        message: 'No encontramos la información solicitada.',
      }),
    )

    renderAt('/eventos/999999')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No encontramos la información solicitada.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('shows the safe application error message (not the not-found state) for a non-3001 SGEB error, and never technical_message', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(500, {
        code: 'SGEB-5008',
        message: 'No pudimos completar la operación.',
        technical_message: 'stack trace secreto interno',
      }),
    )

    renderAt('/eventos/1001')

    expect(
      await screen.findByText('No pudimos completar la operación.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/stack trace secreto interno/)).not.toBeInTheDocument()
    expect(
      screen.queryByText('No encontramos el evento solicitado.'),
    ).not.toBeInTheDocument()
  })

  it('shows a network error message distinctly and offers a retry that refetches', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    )

    const user = userEvent.setup()
    renderAt('/eventos/1001')

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope(RECORD))
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Boda García' }),
    ).toBeInTheDocument()
  })

  it('retries a network failure a bounded number of times before giving up', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new SgebNetworkError('Sin conexión.'))

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(screen.getByText('Sin conexión.')).toBeInTheDocument()
    })
    // Original call + 2 bounded retries, never unbounded.
    expect(vi.mocked(requestSgeb).mock.calls.length).toBe(3)
  })

  it('propagates an AbortSignal to the SGEB transport', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope(RECORD))

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalled()
    })
    const config = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(config.signal).toBeInstanceOf(AbortSignal)
  })

  it('still renders the back link and the operational roadmap navigation', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope(RECORD))

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(screen.getByRole('link', { name: /Volver a eventos/ })).toHaveAttribute(
      'href',
      '/eventos',
    )
    expect(screen.getByRole('link', { name: 'Selección de equipo' })).toHaveAttribute(
      'href',
      '/eventos/1001/equipo',
    )
  })

  it('never calls the transport with a mutation method', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(successEnvelope(RECORD))

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalled()
    })
    for (const call of vi.mocked(requestSgeb).mock.calls) {
      expect(['GET', undefined]).toContain(call[0].method)
    }
  })
})
