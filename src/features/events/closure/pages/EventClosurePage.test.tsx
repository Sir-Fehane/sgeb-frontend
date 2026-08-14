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
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import type { SgebRequestConfig } from '@/shared/api/sgebClient'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { ApiEnvelope } from '@/shared/types/api'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function successEnvelope<T>(data: T): ApiEnvelope<T> {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

const EVENTO_RECORD: EventoApiRecord = {
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
  } = {},
) {
  let reportes = options.reportes ? [...options.reportes] : []
  let nextId = 1000
  const eventoUrl = `/eventos/${String(idEvento)}`
  const readinessUrl = `/eventos/${String(idEvento)}/cierre`
  const reportesUrl = `/eventos/${String(idEvento)}/reportes-merma`

  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === eventoUrl && !config.method) {
      if (options.evento instanceof Error) return Promise.reject(options.evento)
      return Promise.resolve(successEnvelope(options.evento ?? EVENTO_RECORD))
    }
    if (config.url === readinessUrl && !config.method) {
      if (options.readiness instanceof Error) return Promise.reject(options.readiness)
      return Promise.resolve(successEnvelope(options.readiness ?? READINESS_BLOCKED))
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
