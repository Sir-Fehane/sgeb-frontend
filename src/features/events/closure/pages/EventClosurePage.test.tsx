import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EventClosurePage } from '@/features/events/closure/pages/EventClosurePage'
import type {
  ClosureReadinessApiRecord,
  ReporteMermaApiRecord,
} from '@/features/events/closure/services/closureApi'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import type { SgebRequestConfig } from '@/shared/api/sgebClient'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { ApiEnvelope } from '@/shared/types/api'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

/** Renders outside `SocketProvider` — see `EventDetailPage.test.tsx`'s identical stub for why. */
vi.mock('@/shared/realtime/useEventRealtimeRoom', () => ({
  useEventRealtimeRoom: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
})

function authenticate(rol: 'capitan' | 'admin' | 'mesero') {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: { sub: 'uuid-test-user', rol },
  })
}

function successEnvelope<T>(data: T): ApiEnvelope<T> {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

const EVENTO_RECORD: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 1,
  capitan: {
    uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellido_paterno: 'Prueba',
    apellido_materno: null,
    correo: 'capitan.prueba@example.com',
  },
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
  estado: 'en_curso',
  creado_en: '2026-07-01T09:00:00',
}

const READINESS_BLOCKED: ClosureReadinessApiRecord = {
  evento_finalizado: false,
  participaciones_total: 8,
  participaciones_sin_salida: 3,
  meseros_sin_clabe_vigente: 2,
  listo: false,
}

const READINESS_READY: ClosureReadinessApiRecord = {
  evento_finalizado: true,
  participaciones_total: 5,
  participaciones_sin_salida: 0,
  meseros_sin_clabe_vigente: 0,
  listo: true,
}

const EXISTING_REPORT: ReporteMermaApiRecord = {
  id_reporte: 42,
  id_evento: 1001,
  observaciones: 'Se rompieron al recoger el salón.',
  fecha: '2026-09-12T23:10:00Z',
  detalles: [
    {
      id_merma_det: 1,
      id_reporte: 42,
      tipo: 'copa_rota',
      descripcion: 'Copas de la barra',
      cantidad: 4,
      costo_estimado: 320,
    },
  ],
}

/**
 * A small stateful fake of the SGEB transport, scoped to one event id —
 * mirrors `EventMontagePage.test.tsx`'s `fakeTransport`. A successful POST
 * appends to the in-memory `reportes` list, so the mutation's cache
 * invalidation → refetch reflects real new state, exactly like the pinned
 * backend.
 */
function fakeTransport(
  idEvento: number,
  options: {
    evento?: EventoApiRecord | SgebApplicationError | SgebNetworkError
    readiness?: ClosureReadinessApiRecord | SgebApplicationError | SgebNetworkError
    reportes?: ReporteMermaApiRecord[]
    createError?: SgebApplicationError
    finalizeError?: SgebApplicationError | SgebNetworkError
  } = {},
) {
  let reportes = options.reportes ? [...options.reportes] : []
  let nextId = 1000
  let evento: EventoApiRecord =
    options.evento instanceof Error ? EVENTO_RECORD : (options.evento ?? EVENTO_RECORD)
  let readiness: ClosureReadinessApiRecord =
    options.readiness instanceof Error
      ? READINESS_BLOCKED
      : (options.readiness ?? READINESS_BLOCKED)
  const eventoUrl = `/eventos/${String(idEvento)}`
  const readinessUrl = `/eventos/${String(idEvento)}/cierre`
  const reportesUrl = `/eventos/${String(idEvento)}/reportes-merma`
  const estadoUrl = `/eventos/${String(idEvento)}/estado`

  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === eventoUrl && !config.method) {
      if (options.evento instanceof Error) return Promise.reject(options.evento)
      return Promise.resolve(successEnvelope(evento))
    }
    if (config.url === readinessUrl && !config.method) {
      if (options.readiness instanceof Error) return Promise.reject(options.readiness)
      return Promise.resolve(successEnvelope(readiness))
    }
    if (config.url === reportesUrl && !config.method) {
      return Promise.resolve(
        successEnvelope({ reportes, costo_total: 0, piezas_sin_costear: 0 }),
      )
    }
    if (config.method === 'POST' && config.url === reportesUrl) {
      if (options.createError) {
        return Promise.reject(options.createError)
      }
      const body = config.data as {
        observaciones?: string | null
        detalles: {
          tipo: string
          descripcion?: string | null
          cantidad: number
          costoEstimado?: number | null
        }[]
      }
      const created: ReporteMermaApiRecord = {
        id_reporte: nextId,
        id_evento: idEvento,
        observaciones: body.observaciones ?? null,
        fecha: '2026-09-13T00:00:00Z',
        detalles: body.detalles.map((d, index) => ({
          id_merma_det: nextId * 10 + index,
          id_reporte: nextId,
          tipo: d.tipo as ReporteMermaApiRecord['detalles'][number]['tipo'],
          descripcion: d.descripcion ?? null,
          cantidad: d.cantidad,
          costo_estimado: d.costoEstimado ?? null,
        })),
      }
      nextId += 1
      reportes = [created, ...reportes]
      return Promise.resolve(successEnvelope(created))
    }
    if (config.method === 'PATCH' && config.url === estadoUrl) {
      if (options.finalizeError) {
        return Promise.reject(options.finalizeError)
      }
      // Mirrors the pinned backend: the server seals `fin` and flips
      // `estado`/`evento_finalizado` itself — never client-supplied.
      evento = { ...evento, estado: 'finalizado', fin: '2026-09-13T02:00:00' }
      readiness = { ...readiness, evento_finalizado: true }
      return Promise.resolve(successEnvelope(evento))
    }
    throw new Error(`Unexpected requestSgeb call in test: ${JSON.stringify(config)}`)
  })
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/eventos/:id/cierre" element={<EventClosurePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventClosurePage', () => {
  it('renders the real event and readiness from the transport, not development fixtures', async () => {
    fakeTransport(1001, { readiness: READINESS_BLOCKED })

    renderAt('/eventos/1001/cierre')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Cierre del evento' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Estado del cierre')).toBeInTheDocument()
    expect(screen.getByText('Evento pendiente de finalizar')).toBeInTheDocument()
    expect(screen.getByText('No listo para calcular pagos')).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/i)).not.toBeInTheDocument()
  })

  it('shows the empty merma-reports state from a live empty response', async () => {
    fakeTransport(1001, { reportes: [] })

    renderAt('/eventos/1001/cierre')

    expect(
      await screen.findByText(
        'Aún no se han registrado reportes de merma para este evento.',
      ),
    ).toBeInTheDocument()
  })

  it('shows populated merma reports from the live response', async () => {
    fakeTransport(1001, { reportes: [EXISTING_REPORT] })

    renderAt('/eventos/1001/cierre')

    const reportsSection = (
      await screen.findByRole('list', { name: 'Reportes de merma registrados' })
    ).closest('section')!
    expect(within(reportsSection).getByText(/Copa rota/)).toBeInTheDocument()
    expect(within(reportsSection).getByText(/cantidad 4/)).toBeInTheDocument()
  })

  it('shows the ready readiness state and the "Ir a pagos" link when listo is true', async () => {
    fakeTransport(1001, { readiness: READINESS_READY })

    renderAt('/eventos/1001/cierre')

    expect(await screen.findByText('Listo para calcular pagos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a pagos' })).toHaveAttribute(
      'href',
      '/eventos/1001/pagos',
    )
  })

  it('renders the unavailable state for a malformed event id, without calling the transport', () => {
    renderAt('/eventos/not-a-number/cierre')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('renders the unavailable state for a well-formed id with no matching event (SGEB-3001)', async () => {
    fakeTransport(999999, {
      evento: new SgebApplicationError(404, {
        code: 'SGEB-3001',
        message: 'No encontramos la información solicitada.',
      }),
    })

    renderAt('/eventos/999999/cierre')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('shows a loading state while requests are pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderAt('/eventos/1001/cierre')

    expect(
      screen.getByRole('status', { name: 'Cargando cierre del evento' }),
    ).toBeInTheDocument()
  })

  it('shows a safe network error message and offers a retry', async () => {
    fakeTransport(1001, {
      readiness: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    fakeTransport(1001, { readiness: READINESS_BLOCKED })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Estado del cierre')).toBeInTheDocument()
  })

  it('submitting the merma form POSTs the real wire shape (costoEstimado camelCase) and the new report appears after refetch', async () => {
    fakeTransport(1001, { reportes: [] })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')

    expect(
      await screen.findByText(
        'Aún no se han registrado reportes de merma para este evento.',
      ),
    ).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'vaso_roto',
    )
    const cantidad = screen.getByRole('spinbutton', { name: /Cantidad 1/ })
    await user.clear(cantidad)
    await user.type(cantidad, '3')
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/eventos/1001/reportes-merma',
        method: 'POST',
        data: {
          observaciones: null,
          detalles: [
            { tipo: 'vaso_roto', descripcion: null, cantidad: 3, costoEstimado: null },
          ],
        },
      })
    })

    expect(await screen.findByText('Reporte registrado.')).toBeInTheDocument()
    const reportsSection = (
      await screen.findByRole('list', { name: 'Reportes de merma registrados' })
    ).closest('section')!
    expect(within(reportsSection).getByText(/Vaso roto/)).toBeInTheDocument()
    expect(within(reportsSection).getByText(/cantidad 3/)).toBeInTheDocument()
  })

  it('a repeated click while submitting only sends one POST', async () => {
    fakeTransport(1001, { reportes: [] })

    renderAt('/eventos/1001/cierre')
    await screen.findByText(
      'Aún no se han registrado reportes de merma para este evento.',
    )

    fireEvent.change(screen.getByRole('combobox', { name: /Tipo de artículo 1/ }), {
      target: { value: 'otro' },
    })
    const button = screen.getByRole('button', { name: 'Registrar reporte de merma' })
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        vi.mocked(requestSgeb).mock.calls.filter((call) => call[0].method === 'POST'),
      ).toHaveLength(1)
    })
  })

  it('shows the backend-approved error message inline when submission fails, never technical_message, and never resets the form', async () => {
    fakeTransport(1001, {
      reportes: [],
      createError: new SgebApplicationError(409, {
        code: 'SGEB-4013',
        message: 'El evento no está en la etapa requerida para esta operación.',
        technical_message: 'detalle interno',
      }),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await screen.findByText(
      'Aún no se han registrado reportes de merma para este evento.',
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'otro',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    expect(
      await screen.findByText(
        'El evento no está en la etapa requerida para esta operación.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/detalle interno/)).not.toBeInTheDocument()
    expect(screen.queryByText('Reporte registrado.')).not.toBeInTheDocument()
    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: /Tipo de artículo 1/ })
        .value,
    ).toBe('otro')
  })

  it('never exposes a payment-calculation action anywhere on this page', async () => {
    fakeTransport(1001, { readiness: READINESS_READY })

    renderAt('/eventos/1001/cierre')

    await screen.findByText('Listo para calcular pagos')
    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
  })
})

describe('EventClosurePage — event finalization, availability by role and estado', () => {
  it('does not offer "Finalizar evento" without an authenticated session', async () => {
    fakeTransport(1001)

    renderAt('/eventos/1001/cierre')

    await screen.findByText('Estado del cierre')
    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })

  it('does not offer "Finalizar evento" for a mesero', async () => {
    authenticate('mesero')
    fakeTransport(1001)

    renderAt('/eventos/1001/cierre')

    await screen.findByText('Estado del cierre')
    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })

  it('offers "Finalizar evento" for a capitan when the event is en_curso', async () => {
    authenticate('capitan')
    fakeTransport(1001)

    renderAt('/eventos/1001/cierre')

    expect(
      await screen.findByRole('button', { name: 'Finalizar evento' }),
    ).toBeInTheDocument()
  })

  it('offers "Finalizar evento" for an admin when the event is en_curso', async () => {
    authenticate('admin')
    fakeTransport(1001)

    renderAt('/eventos/1001/cierre')

    expect(
      await screen.findByRole('button', { name: 'Finalizar evento' }),
    ).toBeInTheDocument()
  })

  it('does not offer "Finalizar evento" for a capitan when the event is not en_curso', async () => {
    authenticate('capitan')
    fakeTransport(1001, { evento: { ...EVENTO_RECORD, estado: 'publicado' } })

    renderAt('/eventos/1001/cierre')

    await screen.findByText('Estado del cierre')
    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })

  it('shows a read-only completed state for a capitan when the event is already finalizado', async () => {
    authenticate('capitan')
    fakeTransport(1001, {
      evento: { ...EVENTO_RECORD, estado: 'finalizado', fin: '2026-09-13T02:00:00' },
      readiness: READINESS_READY,
    })

    renderAt('/eventos/1001/cierre')

    expect(await screen.findByText('Este evento ya fue finalizado.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })
})

describe('EventClosurePage — event finalization, confirmation and submit flow', () => {
  it('clicking "Finalizar evento" does not call the transport — only confirming does', async () => {
    authenticate('capitan')
    fakeTransport(1001)
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))

    expect(
      vi.mocked(requestSgeb).mock.calls.filter((call) => call[0].method === 'PATCH'),
    ).toHaveLength(0)
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument()
  })

  it('cancel closes the confirmation without ever calling the transport', async () => {
    authenticate('capitan')
    fakeTransport(1001)
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      vi.mocked(requestSgeb).mock.calls.filter((call) => call[0].method === 'PATCH'),
    ).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Finalizar evento' })).toBeInTheDocument()
  })

  it('confirming sends exactly one PATCH /eventos/{id}/estado with { estado: "finalizado" } — no client fin', async () => {
    authenticate('capitan')
    fakeTransport(1001)
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/eventos/1001/estado',
        method: 'PATCH',
        data: { estado: 'finalizado' },
      })
    })
    expect(
      vi.mocked(requestSgeb).mock.calls.filter((call) => call[0].method === 'PATCH'),
    ).toHaveLength(1)
  })

  it('a repeated click on confirm while pending only sends one PATCH', async () => {
    authenticate('capitan')
    fakeTransport(1001)

    renderAt('/eventos/1001/cierre')
    await screen.findByRole('button', { name: 'Finalizar evento' })
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar evento' }))
    const confirmButton = await screen.findByRole('button', {
      name: 'Confirmar finalización',
    })
    fireEvent.click(confirmButton)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(
        vi.mocked(requestSgeb).mock.calls.filter((call) => call[0].method === 'PATCH'),
      ).toHaveLength(1)
    })
  })

  it('on success, refetches readiness/event state authoritatively — no optimistic write, real server state drives the UI', async () => {
    authenticate('capitan')
    fakeTransport(1001, { readiness: READINESS_BLOCKED })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    expect(await screen.findByText('Evento pendiente de finalizar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    expect(await screen.findByText('Este evento ya fue finalizado.')).toBeInTheDocument()
    expect(await screen.findByText('Completado')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })

  it('shows the "Evento finalizado" success toast only after the PATCH actually resolves', async () => {
    // `{ selector: 'p' }` — the readiness section already renders a
    // pre-existing `<dt>Evento finalizado</dt>` label regardless of
    // outcome (`EventClosureReadinessSection`); the toast's own title
    // renders as a `<p>` (`Alert`'s title slot), so this disambiguates
    // the two identical strings rather than colliding with the
    // always-present readiness label.
    authenticate('capitan')
    fakeTransport(1001, { readiness: READINESS_BLOCKED })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await screen.findByRole('button', { name: 'Finalizar evento' })
    expect(
      screen.queryByText('Evento finalizado', { selector: 'p' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    expect(
      await screen.findByText('Evento finalizado', { selector: 'p' }),
    ).toBeInTheDocument()
  })

  it('never shows a success toast when finalizing fails — only the real backend error', async () => {
    authenticate('capitan')
    fakeTransport(1001, {
      finalizeError: new SgebApplicationError(409, {
        code: 'SGEB-4011',
        message:
          'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
      }),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    expect(
      await screen.findByText(
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Evento finalizado', { selector: 'p' }),
    ).not.toBeInTheDocument()
  })

  it('shows the safe backend message for a repeated/invalid transition (SGEB-4011), never technical_message, and does not mark the event finalized', async () => {
    authenticate('capitan')
    fakeTransport(1001, {
      finalizeError: new SgebApplicationError(409, {
        code: 'SGEB-4011',
        message:
          'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
        technical_message: 'Transición inválida en_curso → finalizado (detalle interno)',
      }),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    expect(
      await screen.findByText(
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/detalle interno/)).not.toBeInTheDocument()
    expect(screen.queryByText('Este evento ya fue finalizado.')).not.toBeInTheDocument()
  })

  it('shows a safe message for an authorization failure (SGEB-1004), never technical_message', async () => {
    authenticate('capitan')
    fakeTransport(1001, {
      finalizeError: new SgebApplicationError(403, {
        code: 'SGEB-1004',
        message: 'No tienes permisos para realizar esta acción.',
        technical_message: 'capitán ajeno al evento',
      }),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    expect(
      await screen.findByText('No tienes permisos para realizar esta acción.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/capitán ajeno/)).not.toBeInTheDocument()
  })

  it('shows a safe message for a network error, never technical_message', async () => {
    authenticate('capitan')
    fakeTransport(1001, {
      finalizeError: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.'),
    ).toBeInTheDocument()
  })
})

describe('EventClosurePage — event finalization, domain boundaries', () => {
  it('never calls a participaciones/salida, pagos, comanda, or montaje endpoint from this screen', async () => {
    authenticate('capitan')
    fakeTransport(1001)
    const user = userEvent.setup()

    renderAt('/eventos/1001/cierre')
    await user.click(await screen.findByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    await screen.findByText('Este evento ya fue finalizado.')

    const calledUrls = vi.mocked(requestSgeb).mock.calls.map((call) => call[0].url)
    for (const forbidden of ['salida', 'pagos', 'comanda', 'montaje']) {
      expect(calledUrls.some((url) => url.includes(forbidden))).toBe(false)
    }
  })

  it('never exposes a participant-salida or payment action on this page', async () => {
    authenticate('capitan')
    fakeTransport(1001)

    renderAt('/eventos/1001/cierre')
    await screen.findByRole('button', { name: 'Finalizar evento' })

    expect(
      screen.queryByRole('button', { name: /Marcar salida/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
  })
})
