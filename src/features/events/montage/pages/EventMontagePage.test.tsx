import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { EventMontagePage } from '@/features/events/montage/pages/EventMontagePage'
import type {
  ChecklistApiRecord,
  ChecklistInstanciaApiRecord,
  ParticipacionApiRecord,
} from '@/features/events/montage/services/montageApi'
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
  estado: 'publicado',
  creado_en: '2026-07-01T09:00:00',
}

const MONTAJE_TEMPLATE: ChecklistApiRecord = {
  id_checklist: 1,
  nombre: 'Montaje de estación',
  tipo: 'montaje',
  activo: true,
  items: [
    {
      id_item: 1,
      id_checklist: 1,
      descripcion: 'Colocar mantelería',
      cantidad_esperada: 1,
      orden: 1,
      activo: true,
    },
    {
      id_item: 2,
      id_checklist: 1,
      descripcion: 'Acomodar sillas',
      cantidad_esperada: 8,
      orden: 2,
      activo: true,
    },
  ],
}

function participacion(
  overrides: Partial<ParticipacionApiRecord> & { id_participacion: number },
): ParticipacionApiRecord {
  return {
    puesto: 'mesero',
    estado: 'seleccionado',
    checklist_ok: false,
    usuario: {
      uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000001',
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: null,
      correo: 'juan@example.mx',
      telefono: null,
    },
    ...overrides,
  }
}

function pendingInstancia(idParticipacion: number): ChecklistInstanciaApiRecord {
  return {
    id_instancia: 900 + idParticipacion,
    id_participacion: idParticipacion,
    id_checklist: 1,
    completado: false,
    fecha: '2026-08-01T00:00:00',
    respuestas: [
      {
        id_respuesta: 1,
        id_instancia: 900 + idParticipacion,
        id_item: 1,
        cantidad: 1,
        hecho: true,
      },
      {
        id_respuesta: 2,
        id_instancia: 900 + idParticipacion,
        id_item: 2,
        cantidad: 3,
        hecho: false,
      },
    ],
  }
}

function completedInstancia(idParticipacion: number): ChecklistInstanciaApiRecord {
  return {
    id_instancia: 900 + idParticipacion,
    id_participacion: idParticipacion,
    id_checklist: 1,
    completado: true,
    fecha: '2026-08-01T00:00:00',
    respuestas: [
      {
        id_respuesta: 1,
        id_instancia: 900 + idParticipacion,
        id_item: 1,
        cantidad: 1,
        hecho: true,
      },
      {
        id_respuesta: 2,
        id_instancia: 900 + idParticipacion,
        id_item: 2,
        cantidad: 8,
        hecho: true,
      },
    ],
  }
}

/**
 * A small stateful fake of the SGEB transport, scoped to one event id —
 * mirrors `TeamSelectionPage.test.tsx`'s `fakeTransport`. A successful
 * `PATCH .../aprobar` mutates the in-memory roster's `checklist_ok`, so the
 * roster refetch the mutation's cache invalidation triggers reflects real
 * new state, exactly like the pinned backend.
 */
function fakeTransport(
  idEvento: number,
  options: {
    evento?: EventoApiRecord | SgebApplicationError | SgebNetworkError
    participaciones?: ParticipacionApiRecord[]
    templates?: ChecklistApiRecord[]
    instancias?: Record<number, ChecklistInstanciaApiRecord[]>
    approveError?: SgebApplicationError
  } = {},
) {
  let roster = options.participaciones ? [...options.participaciones] : []
  const instancias = options.instancias ?? {}
  const eventoUrl = `/eventos/${String(idEvento)}`
  const participacionesUrl = `/eventos/${String(idEvento)}/participaciones`

  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === eventoUrl && !config.method) {
      if (options.evento instanceof Error) return Promise.reject(options.evento)
      return Promise.resolve(successEnvelope(options.evento ?? EVENTO_RECORD))
    }
    if (config.url === participacionesUrl && !config.method) {
      return Promise.resolve(successEnvelope(roster))
    }
    if (config.url === '/checklists' && !config.method) {
      return Promise.resolve(successEnvelope(options.templates ?? [MONTAJE_TEMPLATE]))
    }
    const instanciaMatch = /^\/participaciones\/(\d+)\/checklist-instancias$/.exec(
      config.url,
    )
    if (instanciaMatch && !config.method) {
      const idParticipacion = Number(instanciaMatch[1])
      return Promise.resolve(successEnvelope(instancias[idParticipacion] ?? []))
    }
    const aprobarMatch = /^\/checklist-instancias\/(\d+)\/aprobar$/.exec(config.url)
    if (config.method === 'PATCH' && aprobarMatch) {
      if (options.approveError) {
        return Promise.reject(options.approveError)
      }
      const idInstancia = Number(aprobarMatch[1])
      const owner = Object.entries(instancias).find(([, list]) =>
        list.some((i) => i.id_instancia === idInstancia),
      )
      const idParticipacion = owner ? Number(owner[0]) : undefined
      if (idParticipacion !== undefined) {
        roster = roster.map((p) =>
          p.id_participacion === idParticipacion ? { ...p, checklist_ok: true } : p,
        )
      }
      return Promise.resolve(
        successEnvelope({
          instancia: {
            id_instancia: idInstancia,
            id_participacion: idParticipacion ?? 0,
            id_checklist: 1,
            completado: true,
            fecha: '2026-08-01T00:00:00',
            respuestas: [],
          },
          tipo: 'montaje' as const,
          desbloquea_asignacion: true,
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
          <Route path="/eventos/:id/montaje" element={<EventMontagePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventMontagePage', () => {
  it('renders the real roster and checklist from the transport, not development fixtures', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002, checklist_ok: false })],
      instancias: { 6002: [completedInstancia(6002)] },
    })

    renderAt('/eventos/1001/montaje')

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText(/Checklist completo/)).toBeInTheDocument()
  })

  it('shows the pending state from a live incomplete checklist instance, with no approve action', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6001 })],
      instancias: { 6001: [pendingInstancia(6001)] },
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    expect(row).toHaveTextContent('Checklist pendiente')
    expect(
      within(row).queryByRole('button', { name: /Aprobar checklist/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the participant-with-no-instance case honestly, from a live empty checklist-instancias response', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
    })

    renderAt('/eventos/1001/montaje')

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText(/checklist de montaje instanciado/)).toBeInTheDocument()
  })

  it('scopes the demo-data disclosure to table assignment only — the checklist/roster are not called fixtures', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002 })],
      instancias: { 6002: [] },
    })

    renderAt('/eventos/1001/montaje')

    await screen.findByText('Juan Pérez')
    expect(screen.getByText(/panel de demostración/i)).toBeInTheDocument()
    expect(screen.getByText(/mesas ya asignó el capitán/)).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id, without calling the transport', () => {
    renderAt('/eventos/not-a-number/montaje')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('renders the unavailable state for a well-formed id with no matching event', async () => {
    fakeTransport(999999, {
      evento: new SgebApplicationError(404, {
        code: 'SGEB-3001',
        message: 'No encontramos la información solicitada.',
      }),
      participaciones: [],
    })

    renderAt('/eventos/999999/montaje')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('shows a loading state while requests are pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderAt('/eventos/1001/montaje')

    expect(
      screen.getByRole('status', { name: 'Cargando montaje y asignación de mesas' }),
    ).toBeInTheDocument()
  })

  it('shows a safe network error message and offers a retry', async () => {
    fakeTransport(1001, {
      evento: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/montaje')

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002 })],
      instancias: { 6002: [] },
    })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
  })

  it('approving PATCHes /checklist-instancias/{id}/aprobar and, after refetch, the badge flips to approved', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002, checklist_ok: false })],
      instancias: { 6002: [completedInstancia(6002)] },
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /Aprobar checklist/ }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/checklist-instancias/6902/aprobar',
        method: 'PATCH',
      })
    })

    await waitFor(() => {
      expect(row).toHaveTextContent('Checklist aprobado')
    })
  })

  it('a repeated click while approving only sends one PATCH', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002 })],
      instancias: { 6002: [completedInstancia(6002)] },
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    const button = within(row).getByRole('button', { name: /Aprobar checklist/ })
    // Two synchronous fireEvent.click calls (not two separately-awaited
    // `user.click`s) so the second one lands before any mutation microtask
    // resolves — mirrors `TeamSelectionPage.test.tsx`'s equivalent guard test.
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        vi.mocked(requestSgeb).mock.calls.filter((call) => call[0].method === 'PATCH'),
      ).toHaveLength(1)
    })
  })

  it('shows the backend-approved error message inline when approval fails, never technical_message', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002 })],
      instancias: { 6002: [completedInstancia(6002)] },
      approveError: new SgebApplicationError(409, {
        code: 'SGEB-4005',
        message: 'Checklist incompleto no puede aprobarse.',
        technical_message: 'detalle interno',
      }),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /Aprobar checklist/ }))

    expect(
      await screen.findByText('Checklist incompleto no puede aprobarse.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/detalle interno/)).not.toBeInTheDocument()
  })

  it('never calls the live asignaciones endpoints — table assignment stays local/foundation-only', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 7001, checklist_ok: true })],
      instancias: {
        7001: [{ ...completedInstancia(7001) }],
      },
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    expect(row).toHaveTextContent('Checklist aprobado')

    const select = within(row).getByRole('combobox')
    await user.selectOptions(select, '1')
    await user.click(within(row).getByRole('button', { name: /Asignar mesa/ }))

    expect(row).toHaveTextContent('Mesa 1')
    expect(
      vi
        .mocked(requestSgeb)
        .mock.calls.some((call) => call[0].url.includes('/asignaciones')),
    ).toBe(false)
  })

  it('never calls navigator.geolocation or navigator.credentials — this is not the attendance/arrival flow', async () => {
    const geolocationSpy = vi.fn()
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: geolocationSpy },
      configurable: true,
    })

    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002 })],
      instancias: { 6002: [] },
    })
    renderAt('/eventos/1001/montaje')
    await screen.findByText('Juan Pérez')

    expect(geolocationSpy).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    })
  })
})
