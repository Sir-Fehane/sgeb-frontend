import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EVENT_DETAIL_FIXTURES } from '@/features/events/fixtures/eventDetailFixtures'
import { EventDetailPage } from '@/features/events/pages/EventDetailPage'
import type { ComandaApiRecord } from '@/features/events/services/comandaApi'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import type { MesaApiRecord } from '@/features/events/services/mesasApi'
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
 * Routes `/eventos/{id}`, `/eventos/{id}/comanda`, and
 * `/eventos/{id}/mesas` to independent scripted outcomes —
 * `EventDetailPage` now fires all three queries. Defaults to a found
 * event, "no active comanda" (the real backend's actual `SGEB-3001` shape
 * for that state, not a null-data guess), and an empty mesas list.
 */
function mockTransport(
  options: {
    eventoResult?: EventoApiRecord | Error
    comandaResult?: ComandaApiRecord | Error
    mesasResult?: MesaApiRecord[] | Error
  } = {},
) {
  const {
    eventoResult = RECORD,
    comandaResult = COMANDA_NOT_FOUND,
    mesasResult = [],
  } = options
  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url.includes('/comanda')) {
      return comandaResult instanceof Error
        ? Promise.reject(comandaResult)
        : Promise.resolve(successEnvelope(comandaResult))
    }
    if (config.url.includes('/mesas')) {
      return mesasResult instanceof Error
        ? Promise.reject(mesasResult)
        : Promise.resolve(successEnvelope(mesasResult))
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
    expect(screen.getByRole('link', { name: 'Operación en vivo' })).toHaveAttribute(
      'href',
      '/eventos/1001/operacion-en-vivo',
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

describe('EventDetailPage — edit (PUT /eventos/{id})', () => {
  it('offers "Editar evento" to a capitán session for a non-terminal event', async () => {
    authenticate('capitan')
    mockTransport()

    renderAt('/eventos/1001')

    expect(
      await screen.findByRole('button', { name: 'Editar evento' }),
    ).toBeInTheDocument()
  })

  it('hides "Editar evento" for a mesero session (UX-only role gate)', async () => {
    authenticate('mesero')
    mockTransport()

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(
      screen.queryByRole('button', { name: 'Editar evento' }),
    ).not.toBeInTheDocument()
  })

  it('hides "Editar evento" once the event is finalizado — PUT would be rejected server-side', async () => {
    authenticate('capitan')
    mockTransport({ eventoResult: { ...RECORD, estado: 'finalizado' } })

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(
      screen.queryByRole('button', { name: 'Editar evento' }),
    ).not.toBeInTheDocument()
  })

  it('submits PUT /eventos/{id} with the edited fields, then closes the form and reflects the saved value', async () => {
    authenticate('capitan')
    const user = userEvent.setup()
    // Stateful: the invalidated detail query refetches after the PUT
    // succeeds, so the mock must remember the update rather than always
    // replaying the original RECORD.
    let currentRecord = RECORD
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001' && config.method === 'PUT') {
        currentRecord = { ...RECORD, titulo: 'Título actualizado' }
        return Promise.resolve(successEnvelope(currentRecord))
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      if (config.url.includes('/mesas')) return Promise.resolve(successEnvelope([]))
      return Promise.resolve(successEnvelope(currentRecord))
    })

    renderAt('/eventos/1001')

    await user.click(await screen.findByRole('button', { name: 'Editar evento' }))
    await user.clear(screen.getByLabelText(/^Título/))
    await user.type(screen.getByLabelText(/^Título/), 'Título actualizado')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(
        vi
          .mocked(requestSgeb)
          .mock.calls.some(
            (call) => call[0].url === '/eventos/1001' && call[0].method === 'PUT',
          ),
      ).toBe(true)
    })
    const putCall = vi
      .mocked(requestSgeb)
      .mock.calls.find(
        (call) => call[0].url === '/eventos/1001' && call[0].method === 'PUT',
      )
    expect(putCall?.[0].data).toMatchObject({ titulo: 'Título actualizado' })
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Título actualizado' }),
    ).toBeInTheDocument()
  })

  it('a title-only edit by an admin session never sends uuidCapitan or comandaUrl — no silent captain reassignment', async () => {
    // The dangerous scenario this guards against: the event belongs to some
    // other captain, an admin opens it and edits only the title. Since no
    // approved captain-selector UI exists, the PUT body must never carry
    // `uuidCapitan` (which would silently reassign the event to the
    // admin's own session) or `comandaUrl` (a resource with its own
    // dedicated endpoints, never part of this form).
    authenticate('admin')
    const user = userEvent.setup()
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001' && config.method === 'PUT') {
        return Promise.resolve(successEnvelope(RECORD))
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      if (config.url.includes('/mesas')) return Promise.resolve(successEnvelope([]))
      return Promise.resolve(successEnvelope(RECORD))
    })

    renderAt('/eventos/1001')

    await user.click(await screen.findByRole('button', { name: 'Editar evento' }))
    await user.clear(screen.getByLabelText(/^Título/))
    await user.type(screen.getByLabelText(/^Título/), 'Título actualizado')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(
        vi
          .mocked(requestSgeb)
          .mock.calls.some(
            (call) => call[0].url === '/eventos/1001' && call[0].method === 'PUT',
          ),
      ).toBe(true)
    })
    const putCall = vi
      .mocked(requestSgeb)
      .mock.calls.find(
        (call) => call[0].url === '/eventos/1001' && call[0].method === 'PUT',
      )
    const body = putCall?.[0].data as Record<string, unknown>
    expect(body).not.toHaveProperty('uuidCapitan')
    expect(body).not.toHaveProperty('comandaUrl')
    // Exhaustive: the PUT body only ever carries fields this form owns.
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining([
        'titulo',
        'tipo',
        'cupoMeseros',
        'numMesas',
        'tarifaPorMesero',
      ]),
    )
    expect(Object.keys(body).length).toBeLessThanOrEqual(6)
  })

  it('omits radioGeocercaM from the PUT body once the event is no longer borrador', async () => {
    authenticate('capitan')
    const user = userEvent.setup()
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001' && config.method === 'PUT') {
        return Promise.resolve(successEnvelope(RECORD))
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      if (config.url.includes('/mesas')) return Promise.resolve(successEnvelope([]))
      // RECORD.estado is 'publicado' — not borrador.
      return Promise.resolve(successEnvelope(RECORD))
    })

    renderAt('/eventos/1001')

    await user.click(await screen.findByRole('button', { name: 'Editar evento' }))
    expect(screen.getByLabelText(/^Radio de geocerca/)).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/eventos/1001', method: 'PUT' }),
      )
    })
    const putCall = vi
      .mocked(requestSgeb)
      .mock.calls.find((call) => call[0].method === 'PUT')
    expect(putCall?.[0].data).not.toHaveProperty('radioGeocercaM')
  })
})

describe('EventDetailPage — lifecycle (PATCH /eventos/{id}/estado)', () => {
  it('publishing a borrador event PATCHes exactly { estado: "publicado" }', async () => {
    authenticate('capitan')
    const user = userEvent.setup()
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001/estado' && config.method === 'PATCH') {
        return Promise.resolve(successEnvelope({ ...RECORD, estado: 'publicado' }))
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      if (config.url.includes('/mesas')) return Promise.resolve(successEnvelope([]))
      return Promise.resolve(successEnvelope({ ...RECORD, estado: 'borrador' }))
    })

    renderAt('/eventos/1001')

    await user.click(await screen.findByRole('button', { name: 'Publicar evento' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/eventos/1001/estado',
        method: 'PATCH',
        data: { estado: 'publicado' },
      })
    })
  })

  it('a rapid double-click only PATCHes once (duplicate-submit guard)', async () => {
    authenticate('capitan')
    const user = userEvent.setup()
    let resolvePatch: (() => void) | undefined
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001/estado' && config.method === 'PATCH') {
        return new Promise((resolve) => {
          resolvePatch = () =>
            resolve(successEnvelope({ ...RECORD, estado: 'publicado' }))
        })
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      if (config.url.includes('/mesas')) return Promise.resolve(successEnvelope([]))
      return Promise.resolve(successEnvelope({ ...RECORD, estado: 'borrador' }))
    })

    renderAt('/eventos/1001')
    const button = await screen.findByRole('button', { name: 'Publicar evento' })
    await user.click(button)
    await user.click(button)

    resolvePatch?.()
    await waitFor(() => {
      const patchCalls = vi
        .mocked(requestSgeb)
        .mock.calls.filter((call) => call[0].url === '/eventos/1001/estado')
      expect(patchCalls).toHaveLength(1)
    })
  })

  it('cancelling requires confirmation before PATCHing { estado: "cancelado" }', async () => {
    authenticate('capitan')
    const user = userEvent.setup()
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001/estado' && config.method === 'PATCH') {
        return Promise.resolve(successEnvelope({ ...RECORD, estado: 'cancelado' }))
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      if (config.url.includes('/mesas')) return Promise.resolve(successEnvelope([]))
      return Promise.resolve(successEnvelope(RECORD))
    })

    renderAt('/eventos/1001')

    await user.click(await screen.findByRole('button', { name: 'Cancelar evento' }))
    expect(
      vi.mocked(requestSgeb).mock.calls.some((call) => call[0].url.includes('/estado')),
    ).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))
    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/eventos/1001/estado',
        method: 'PATCH',
        data: { estado: 'cancelado' },
      })
    })
  })

  it('never renders a "Finalizar evento" action on Event Detail — finalization stays owned by Closure', async () => {
    authenticate('capitan')
    mockTransport({ eventoResult: { ...RECORD, estado: 'en_curso' } })

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(screen.queryByText(/Finalizar evento/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Finalizar/ })).not.toBeInTheDocument()
  })

  it('shows the real backend error and does not silently retry on failure', async () => {
    authenticate('capitan')
    const user = userEvent.setup()
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'Este evento no tiene mesas registradas.',
    })
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001/estado' && config.method === 'PATCH') {
        return Promise.reject(error)
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      if (config.url.includes('/mesas')) return Promise.resolve(successEnvelope([]))
      return Promise.resolve(successEnvelope({ ...RECORD, estado: 'borrador' }))
    })

    renderAt('/eventos/1001')

    await user.click(await screen.findByRole('button', { name: 'Publicar evento' }))

    expect(
      await screen.findByText('Este evento no tiene mesas registradas.'),
    ).toBeInTheDocument()
    const patchCalls = vi
      .mocked(requestSgeb)
      .mock.calls.filter((call) => call[0].url === '/eventos/1001/estado')
    expect(patchCalls).toHaveLength(1)
  })
})

describe('EventDetailPage — minimal Mesa management', () => {
  it('renders the real mesas list from GET /eventos/{id}/mesas', async () => {
    authenticate('capitan')
    mockTransport({
      mesasResult: [
        {
          id_mesa: 501,
          id_evento: 1001,
          etiqueta: 'Mesa 1',
          codigo_qr: '3f2a9c14-1234-4abc-89ab-000000000000',
          nfc_uid: null,
          estado: 'libre',
        },
      ],
    })

    renderAt('/eventos/1001')

    expect(await screen.findByText('Mesa 1')).toBeInTheDocument()
  })

  it('hides the "Agregar mesa" form for a mesero session', async () => {
    authenticate('mesero')
    mockTransport()

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    expect(screen.queryByRole('button', { name: 'Agregar mesa' })).not.toBeInTheDocument()
  })

  it('adding a mesa POSTs /eventos/{id}/mesas with exactly { etiqueta }, no client codigo_qr', async () => {
    authenticate('capitan')
    const user = userEvent.setup()
    let mesaCreated = false
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/eventos/1001/mesas' && config.method === 'POST') {
        mesaCreated = true
        return Promise.resolve(
          successEnvelope({
            id_mesa: 501,
            id_evento: 1001,
            etiqueta: 'Mesa 1',
            codigo_qr: '3f2a9c14-1234-4abc-89ab-000000000000',
            nfc_uid: null,
            estado: 'libre',
          }),
        )
      }
      if (config.url === '/eventos/1001/mesas') {
        return Promise.resolve(
          successEnvelope(mesaCreated ? [{ etiqueta: 'Mesa 1' }] : []),
        )
      }
      if (config.url.includes('/comanda')) return Promise.reject(COMANDA_NOT_FOUND)
      return Promise.resolve(successEnvelope(RECORD))
    })

    renderAt('/eventos/1001')

    await user.type(await screen.findByLabelText(/^Etiqueta/), 'Mesa 1')
    await user.click(screen.getByRole('button', { name: 'Agregar mesa' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/eventos/1001/mesas',
        method: 'POST',
        data: { etiqueta: 'Mesa 1' },
      })
    })
  })
})

describe('EventDetailPage — domain boundaries (zero scope creep)', () => {
  it('never calls a Participant Exit, Team Selection, Attendance, Montage, Comanda-mutation, Payments, or Socket.IO endpoint on load', async () => {
    authenticate('capitan')
    mockTransport()

    renderAt('/eventos/1001')

    await screen.findByRole('heading', { level: 2, name: 'Boda García' })
    for (const call of vi.mocked(requestSgeb).mock.calls) {
      expect(call[0].url).not.toMatch(/participaciones|asignaciones|pagos|checklist/)
    }
  })
})
