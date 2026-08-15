import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EVENT_DETAIL_FIXTURES } from '@/features/events/fixtures/eventDetailFixtures'
import { EventDetailPage } from '@/features/events/pages/EventDetailPage'
import type { ComandaApiRecord } from '@/features/events/services/comandaApi'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb, type SgebRequestConfig } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
})

function successEnvelope(data: unknown) {
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

const COMANDA_RECORD: ComandaApiRecord = {
  id_comanda: 7,
  id_evento: 1001,
  nombre_original: 'XV de María.pdf',
  tipo_mime: 'application/pdf',
  tamano_bytes: 512_000,
  activo: true,
  creado_en: '2026-09-01T10:00:00Z',
}

const COMANDA_NOT_FOUND = new SgebApplicationError(404, {
  code: 'SGEB-3001',
  message: 'No encontramos la información solicitada.',
})

/**
 * Routes `/eventos/{id}` and `/eventos/{id}/comanda` to independent
 * scripted outcomes — `EventDetailPage` now fires both queries. Defaults
 * to a found event and "no active comanda" (the real backend's actual
 * `SGEB-3001` shape for that state, not a null-data guess).
 */
function mockTransport(
  options: {
    eventoResult?: EventoApiRecord | Error
    comandaResult?: ComandaApiRecord | Error
  } = {},
) {
  const { eventoResult = RECORD, comandaResult = COMANDA_NOT_FOUND } = options
  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url.includes('/comanda')) {
      return comandaResult instanceof Error
        ? Promise.reject(comandaResult)
        : Promise.resolve(successEnvelope(comandaResult))
    }
    return eventoResult instanceof Error
      ? Promise.reject(eventoResult)
      : Promise.resolve(successEnvelope(eventoResult))
  })
}

function authenticate(rol: 'capitan' | 'admin' | 'mesero') {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: { sub: 'uuid-test-user', rol },
  })
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
    mockTransport()

    renderAt('/eventos/1001')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Boda García' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/)).not.toBeInTheDocument()
    for (const fixture of EVENT_DETAIL_FIXTURES) {
      expect(screen.queryByText(fixture.titulo)).not.toBeInTheDocument()
    }
  })

  it('requests GET /eventos/{id} with the exact numeric id from the route, as a plain GET', async () => {
    mockTransport()

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/eventos/1001' }),
      )
    })
    const eventoCall = vi
      .mocked(requestSgeb)
      .mock.calls.find((call) => call[0].url === '/eventos/1001')
    expect(eventoCall?.[0].method).toBeUndefined()
  })

  it('shows a loading state while the request is pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderAt('/eventos/1001')

    expect(
      screen.getByRole('status', { name: 'Cargando detalle del evento' }),
    ).toBeInTheDocument()
  })

  it('maps documented wire fields and leaves salonNombre unpopulated (undocumented field)', async () => {
    mockTransport()

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(screen.getByText('16:00')).toBeInTheDocument()
    expect(screen.getAllByText('Información pendiente de integración')).toHaveLength(1)
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
    mockTransport({
      eventoResult: new SgebApplicationError(404, {
        code: 'SGEB-3001',
        message: 'No encontramos la información solicitada.',
      }),
    })

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
    mockTransport({
      eventoResult: new SgebApplicationError(500, {
        code: 'SGEB-5008',
        message: 'No pudimos completar la operación.',
        technical_message: 'stack trace secreto interno',
      }),
    })

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
    mockTransport({
      eventoResult: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })

    const user = userEvent.setup()
    renderAt('/eventos/1001')

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    mockTransport()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Boda García' }),
    ).toBeInTheDocument()
  })

  it('retries a network failure a bounded number of times before giving up (evento query only — comanda is a separate, application-error path here)', async () => {
    mockTransport({ eventoResult: new SgebNetworkError('Sin conexión.') })

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(screen.getByText('Sin conexión.')).toBeInTheDocument()
    })
    const eventoCalls = vi
      .mocked(requestSgeb)
      .mock.calls.filter((call) => call[0].url === '/eventos/1001')
    // Original call + 2 bounded retries, never unbounded.
    expect(eventoCalls.length).toBe(3)
  })

  it('propagates an AbortSignal to the SGEB transport', async () => {
    mockTransport()

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalled()
    })
    const eventoCall = vi
      .mocked(requestSgeb)
      .mock.calls.find((call) => call[0].url === '/eventos/1001')
    expect(eventoCall?.[0].signal).toBeInstanceOf(AbortSignal)
  })

  it('still renders the back link and the operational roadmap navigation', async () => {
    mockTransport()

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

  it('never calls the transport with a mutation method for a plain page load', async () => {
    mockTransport()

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalled()
    })
    for (const call of vi.mocked(requestSgeb).mock.calls) {
      expect(['GET', undefined]).toContain(call[0].method)
    }
  })
})

describe('EventDetailPage — Comanda live wiring', () => {
  it('shows the honest empty state for SGEB-3001 (no active comanda) — not an error', async () => {
    mockTransport()

    renderAt('/eventos/1001')

    expect(
      await screen.findByText('No hay una comanda disponible para este evento.'),
    ).toBeInTheDocument()
  })

  it('shows a safe ERROR state — not the empty state — for an unrelated application error, even one that is also HTTP 404', async () => {
    mockTransport({
      comandaResult: new SgebApplicationError(404, {
        code: 'SGEB-3004',
        message: 'Este recurso ya no está disponible.',
      }),
    })

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(
      await screen.findByText('Este recurso ya no está disponible.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No hay una comanda disponible para este evento.'),
    ).not.toBeInTheDocument()
  })

  it('shows a safe ERROR state — not the empty state — for a comanda authorization error (SGEB-1004)', async () => {
    mockTransport({
      comandaResult: new SgebApplicationError(403, {
        code: 'SGEB-1004',
        message: 'No tienes permisos para realizar esta acción.',
      }),
    })

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(
      await screen.findByText('No tienes permisos para realizar esta acción.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No hay una comanda disponible para este evento.'),
    ).not.toBeInTheDocument()
  })

  it('renders live comanda metadata from GET /eventos/{id}/comanda', async () => {
    mockTransport({ comandaResult: COMANDA_RECORD })

    renderAt('/eventos/1001')

    expect(await screen.findByText('XV de María.pdf')).toBeInTheDocument()
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/comanda' }),
    )
  })

  it('shows a real comanda metadata error distinctly, never technical_message', async () => {
    mockTransport({
      comandaResult: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.'),
    ).toBeInTheDocument()
  })

  it('hides upload/replace/retire controls for a mesero session (UX-only role gate)', async () => {
    authenticate('mesero')
    mockTransport({ comandaResult: COMANDA_RECORD })

    renderAt('/eventos/1001')

    await screen.findByText('XV de María.pdf')
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Retirar comanda' }),
    ).not.toBeInTheDocument()
    // Open/view stays available to any authenticated role that can reach Event Detail.
    expect(screen.getByRole('button', { name: /Abrir comanda/ })).toBeInTheDocument()
  })

  it('shows upload/replace/retire controls for an authenticated capitán session', async () => {
    authenticate('capitan')
    mockTransport({ comandaResult: COMANDA_RECORD })

    renderAt('/eventos/1001')

    await screen.findByText('XV de María.pdf')
    expect(screen.getByLabelText('Reemplazar comanda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirar comanda' })).toBeInTheDocument()
  })

  it('shows upload/replace/retire controls for an authenticated admin session', async () => {
    authenticate('admin')
    mockTransport({ comandaResult: COMANDA_RECORD })

    renderAt('/eventos/1001')

    await screen.findByText('XV de María.pdf')
    expect(screen.getByLabelText('Reemplazar comanda')).toBeInTheDocument()
  })

  it('hides upload/replace/retire controls for an anonymous (unauthenticated) session', async () => {
    mockTransport({ comandaResult: COMANDA_RECORD })

    renderAt('/eventos/1001')

    await screen.findByText('XV de María.pdf')
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Retirar comanda' }),
    ).not.toBeInTheDocument()
  })
})
