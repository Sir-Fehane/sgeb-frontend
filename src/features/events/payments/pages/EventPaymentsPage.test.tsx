import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { EventPaymentsPage } from '@/features/events/payments/pages/EventPaymentsPage'
import type { PagoApiRecord } from '@/features/events/payments/services/paymentsApi'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import type { ClosureReadinessApiRecord } from '@/features/events/closure/services/closureApi'
import type { ParticipacionApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import type { SgebRequestConfig } from '@/shared/api/sgebClient'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { ApiEnvelope } from '@/shared/types/api'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

function authenticate(rol: 'admin' | 'capitan' | 'mesero' = 'capitan') {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: {
      sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Test User',
      email: 'test@example.com',
      rol,
    },
  })
}

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
  authenticate('capitan')
})

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
  tarifa_por_mesero: 850,
  radio_geocerca_m: 150,
  estado: 'finalizado',
  creado_en: '2026-07-01T09:00:00',
}

const READINESS_BLOCKED: ClosureReadinessApiRecord = {
  evento_finalizado: false,
  participaciones_total: 4,
  participaciones_sin_salida: 1,
  meseros_sin_clabe_vigente: 0,
  listo: false,
}

const READINESS_READY: ClosureReadinessApiRecord = {
  evento_finalizado: true,
  participaciones_total: 2,
  participaciones_sin_salida: 0,
  meseros_sin_clabe_vigente: 0,
  listo: true,
}

const PARTICIPACIONES: ParticipacionApiRecord[] = [
  {
    id_participacion: 9001,
    puesto: 'mesero',
    estado: 'salida',
    checklist_ok: true,
    usuario: {
      uuid_usuario: 'uuid-1',
      nombre: 'Ana',
      apellido_paterno: 'López',
      apellido_materno: null,
      correo: 'ana@example.com',
      telefono: null,
    },
  },
  {
    id_participacion: 9002,
    puesto: 'mesero',
    estado: 'salida',
    checklist_ok: true,
    usuario: {
      uuid_usuario: 'uuid-2',
      nombre: 'Beto',
      apellido_paterno: 'Ramírez',
      apellido_materno: 'Cruz',
      correo: 'beto@example.com',
      telefono: null,
    },
  },
]

const PAGO_PENDIENTE: PagoApiRecord = {
  id_pago: 1,
  id_participacion: 9001,
  monto: 850,
  clabe_destino: '0121…8909',
  estado: 'pendiente',
  referencia: null,
  fecha_pago: null,
}

const PAGO_PAGADO: PagoApiRecord = {
  id_pago: 2,
  id_participacion: 9002,
  monto: 850,
  clabe_destino: '0132…4477',
  estado: 'pagado',
  referencia: 'REF-000456',
  fecha_pago: '2026-08-10T20:00:00Z',
}

/**
 * A small stateful fake of the SGEB transport, scoped to one event id —
 * mirrors `EventClosurePage.test.tsx`'s `fakeTransport`. `PATCH
 * /pagos/{id}/fallido` mutates the in-memory `pagos` list to `fallido`
 * BEFORE rejecting, exactly like the pinned backend's documented
 * always-error-but-persisted behavior.
 */
function fakeTransport(
  idEvento: number,
  options: {
    evento?: EventoApiRecord | SgebApplicationError | SgebNetworkError
    readiness?: ClosureReadinessApiRecord | SgebApplicationError | SgebNetworkError
    participaciones?: ParticipacionApiRecord[]
    pagos?: PagoApiRecord[]
    fallidoBehavior?: 'sgeb-5004' | 'network-error'
  } = {},
) {
  const pagos = options.pagos ? options.pagos.map((pago) => ({ ...pago })) : []
  const eventoUrl = `/eventos/${String(idEvento)}`
  const readinessUrl = `/eventos/${String(idEvento)}/cierre`
  const participacionesUrl = `/eventos/${String(idEvento)}/participaciones`
  const pagosUrl = `/eventos/${String(idEvento)}/pagos`
  const calcularUrl = `/eventos/${String(idEvento)}/pagos/calcular`

  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === eventoUrl && !config.method) {
      if (options.evento instanceof Error) return Promise.reject(options.evento)
      return Promise.resolve(successEnvelope(options.evento ?? EVENTO_RECORD))
    }
    if (config.url === readinessUrl && !config.method) {
      if (options.readiness instanceof Error) return Promise.reject(options.readiness)
      return Promise.resolve(successEnvelope(options.readiness ?? READINESS_BLOCKED))
    }
    if (config.url === participacionesUrl && !config.method) {
      return Promise.resolve(successEnvelope(options.participaciones ?? PARTICIPACIONES))
    }
    if (config.url === pagosUrl && !config.method) {
      return Promise.resolve(successEnvelope(pagos))
    }
    if (config.method === 'POST' && config.url === calcularUrl) {
      const nuevo: PagoApiRecord = {
        id_pago: 3,
        id_participacion: 9001,
        monto: 850,
        clabe_destino: '0121…8909',
        estado: 'pendiente',
        referencia: null,
        fecha_pago: null,
      }
      if (!pagos.some((p) => p.id_participacion === nuevo.id_participacion)) {
        pagos.push(nuevo)
      }
      return Promise.resolve(
        successEnvelope({ pagos: [nuevo], total: 850, ya_pagados: 0 }),
      )
    }
    if (config.method === 'PATCH' && config.url?.endsWith('/pagado')) {
      const idPago = Number(config.url.split('/')[2])
      const body = config.data as { referencia: string }
      const pago = pagos.find((p) => p.id_pago === idPago)
      if (pago) {
        pago.estado = 'pagado'
        pago.referencia = body.referencia.toUpperCase()
        pago.fecha_pago = '2026-08-14T12:00:00Z'
        return Promise.resolve(successEnvelope(pago))
      }
      return Promise.reject(
        new SgebApplicationError(404, { code: 'SGEB-3001', message: 'No encontrado.' }),
      )
    }
    if (config.method === 'PATCH' && config.url?.endsWith('/fallido')) {
      const idPago = Number(config.url.split('/')[2])
      const pago = pagos.find((p) => p.id_pago === idPago)
      if (options.fallidoBehavior === 'network-error') {
        return Promise.reject(
          new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
        )
      }
      if (pago) {
        pago.estado = 'fallido'
      }
      return Promise.reject(
        new SgebApplicationError(500, {
          code: 'SGEB-5004',
          message: 'No pudimos registrar la transferencia. Se reintentará.',
        }),
      )
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
          <Route path="/eventos/:id/pagos" element={<EventPaymentsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventPaymentsPage', () => {
  it('renders the real event from the transport, not development fixtures', async () => {
    fakeTransport(1001, { readiness: READINESS_BLOCKED })

    renderAt('/eventos/1001/pagos')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pagos' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/i)).not.toBeInTheDocument()
  })

  it('shows a loading state while requests are pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderAt('/eventos/1001/pagos')

    expect(
      screen.getByRole('status', { name: 'Cargando pagos del evento' }),
    ).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id, without calling the transport', () => {
    renderAt('/eventos/not-a-number/pagos')

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

    renderAt('/eventos/999999/pagos')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('shows a safe network error message and offers a retry', async () => {
    fakeTransport(1001, {
      readiness: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/pagos')

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    fakeTransport(1001, { readiness: READINESS_BLOCKED })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByText('No se pueden calcular los pagos todavía.'),
    ).toBeInTheDocument()
  })

  it('a blocked (not-ready) event shows the blockers and no calculate button', async () => {
    fakeTransport(1001, { readiness: READINESS_BLOCKED })

    renderAt('/eventos/1001/pagos')

    expect(
      await screen.findByText('No se pueden calcular los pagos todavía.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
  })

  it('a ready event shows the populated list with names joined from the live participant roster', async () => {
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: PARTICIPACIONES,
      pagos: [PAGO_PENDIENTE, PAGO_PAGADO],
    })

    renderAt('/eventos/1001/pagos')

    expect(await screen.findByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('Beto Ramírez Cruz')).toBeInTheDocument()
    expect(screen.getByText('0121…8909')).toBeInTheDocument()
  })

  it('falls back to a neutral label when a payment has no matching participation in the roster', async () => {
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: [],
      pagos: [PAGO_PENDIENTE],
    })

    renderAt('/eventos/1001/pagos')

    expect(await screen.findByText('Participación 9001')).toBeInTheDocument()
  })

  it('clicking "Calcular pagos" POSTs /pagos/calcular with no body and the refetched list reflects the new row', async () => {
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: PARTICIPACIONES,
      pagos: [],
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/pagos')

    expect(
      await screen.findByText('Aún no se han calculado pagos para este evento.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Calcular pagos' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/eventos/1001/pagos/calcular',
        method: 'POST',
      })
    })
    expect(await screen.findByText('Ana López')).toBeInTheDocument()
  })

  it('marking a pending payment as paid PATCHes /pagos/{id}/pagado and the row updates to Pagado, uppercase reference', async () => {
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: PARTICIPACIONES,
      pagos: [PAGO_PENDIENTE],
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/pagos')
    await screen.findByText('Ana López')

    await user.click(
      screen.getByRole('button', {
        name: 'Registrar transferencia realizada de Ana López',
      }),
    )
    await user.type(screen.getByLabelText(/Referencia bancaria/), 'nueva-ref-1')
    await user.click(screen.getByRole('button', { name: 'Registrar transferencia' }))

    const row = (await screen.findByText('Ana López')).closest('tr') as HTMLElement
    await waitFor(() => expect(within(row).getByText('Pagado')).toBeInTheDocument())
    expect(row).toHaveTextContent('NUEVA-REF-1')
  })

  it('marking a pending payment as failed against the documented SGEB-5004 response updates the row to Fallido with no danger alert', async () => {
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: PARTICIPACIONES,
      pagos: [PAGO_PENDIENTE],
      fallidoBehavior: 'sgeb-5004',
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/pagos')
    await screen.findByText('Ana López')

    await user.click(
      screen.getByRole('button', {
        name: 'Registrar transferencia rechazada de Ana López',
      }),
    )
    await user.type(screen.getByLabelText(/Motivo/), 'Cuenta bancaria cerrada')
    await user.click(
      screen.getByRole('button', { name: 'Registrar transferencia rechazada' }),
    )

    const row = (await screen.findByText('Ana López')).closest('tr') as HTMLElement
    await waitFor(() => expect(within(row).getByText('Fallido')).toBeInTheDocument())
    expect(within(row).queryByText(/No pudimos registrar/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('marking a pending payment as failed against a genuine network error DOES show the danger alert, proving the SGEB-5004 special-case is not a blanket swallow', async () => {
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: PARTICIPACIONES,
      pagos: [PAGO_PENDIENTE],
      fallidoBehavior: 'network-error',
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/pagos')
    await screen.findByText('Ana López')

    await user.click(
      screen.getByRole('button', {
        name: 'Registrar transferencia rechazada de Ana López',
      }),
    )
    await user.type(screen.getByLabelText(/Motivo/), 'Cuenta bancaria cerrada')
    await user.click(
      screen.getByRole('button', { name: 'Registrar transferencia rechazada' }),
    )

    expect(
      await screen.findByText('No pudimos registrar el resultado. Intenta de nuevo.'),
    ).toBeInTheDocument()
    const row = screen.getByText('Ana López').closest('tr') as HTMLElement
    expect(within(row).queryByText('Fallido')).not.toBeInTheDocument()
  })

  it('never exposes a bulk approval action or the retired endpoint anywhere on this page', async () => {
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: PARTICIPACIONES,
      pagos: [PAGO_PENDIENTE, PAGO_PAGADO],
    })

    renderAt('/eventos/1001/pagos')
    await screen.findByText('Ana López')

    expect(screen.queryByText('pagos/aprobar')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Aprobar todos/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the forbidden state, and never calls the transport at all, for a mesero session — this web console is not the mesero product (native iOS app)', async () => {
    authenticate('mesero')
    fakeTransport(1001, {
      readiness: READINESS_READY,
      participaciones: PARTICIPACIONES,
      pagos: [PAGO_PENDIENTE, PAGO_PAGADO],
    })

    renderAt('/eventos/1001/pagos')

    expect(
      await screen.findByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Ana López')).not.toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })
})
