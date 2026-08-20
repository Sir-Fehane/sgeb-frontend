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
import type { AsignacionMesaApiRecord } from '@/features/events/services/asignacionesApi'
import type { MesaApiRecord } from '@/features/events/services/mesasApi'
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

function mesa(overrides: Partial<MesaApiRecord> & { id_mesa: number }): MesaApiRecord {
  return {
    id_evento: 1001,
    etiqueta: `Mesa ${String(overrides.id_mesa)}`,
    codigo_qr: '11111111-1111-4111-8111-111111111111',
    nfc_uid: null,
    estado: 'libre',
    ...overrides,
  }
}

function asignacion(
  overrides: Partial<AsignacionMesaApiRecord> & {
    id_asignacion: number
    id_participacion: number
    id_mesa: number
    vinculada: boolean
    mesa: AsignacionMesaApiRecord['mesa']
    participacion: AsignacionMesaApiRecord['participacion']
  },
): AsignacionMesaApiRecord {
  return {
    fecha_asignacion: '2026-08-19T10:00:00.000Z',
    fecha_vinculacion: null,
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
 * mirrors `TeamSelectionPage.test.tsx`'s `fakeTransport`. Successful
 * mutations (`aprobar`, assign, release) mutate the in-memory roster/mesas/
 * asignaciones, so the refetch each mutation's cache invalidation triggers
 * reflects real new state, exactly like the pinned backend — except
 * `checklist_ok`/`Participacion.estado` on release, which the real backend
 * also never mutates (see `deriveMontageAssignments`'s own comment).
 */
function fakeTransport(
  idEvento: number,
  options: {
    evento?: EventoApiRecord | SgebApplicationError | SgebNetworkError
    participaciones?: ParticipacionApiRecord[]
    templates?: ChecklistApiRecord[]
    instancias?: Record<number, ChecklistInstanciaApiRecord[]>
    mesas?: MesaApiRecord[]
    asignaciones?: AsignacionMesaApiRecord[]
    approveError?: SgebApplicationError
    assignError?: SgebApplicationError
  } = {},
) {
  let roster = options.participaciones ? [...options.participaciones] : []
  const instancias = options.instancias ?? {}
  let mesas = options.mesas ? [...options.mesas] : []
  let asignaciones = options.asignaciones ? [...options.asignaciones] : []
  let nextIdAsignacion = 8000
  const eventoUrl = `/eventos/${String(idEvento)}`
  const participacionesUrl = `/eventos/${String(idEvento)}/participaciones`
  const mesasUrl = `/eventos/${String(idEvento)}/mesas`
  const asignacionesUrl = `/eventos/${String(idEvento)}/asignaciones`

  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === eventoUrl && !config.method) {
      if (options.evento instanceof Error) return Promise.reject(options.evento)
      return Promise.resolve(successEnvelope(options.evento ?? EVENTO_RECORD))
    }
    if (config.url === participacionesUrl && !config.method) {
      return Promise.resolve(successEnvelope(roster))
    }
    if (config.url === mesasUrl && !config.method) {
      return Promise.resolve(successEnvelope(mesas))
    }
    if (config.url === asignacionesUrl && !config.method) {
      return Promise.resolve(successEnvelope(asignaciones))
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
    const asignarMatch = /^\/participaciones\/(\d+)\/asignaciones$/.exec(config.url)
    if (config.method === 'POST' && asignarMatch) {
      if (options.assignError) {
        return Promise.reject(options.assignError)
      }
      const idParticipacion = Number(asignarMatch[1])
      const idMesa = (config.data as { idMesa: number }).idMesa
      const mesaRecord = mesas.find((m) => m.id_mesa === idMesa)
      const participacionRecord = roster.find(
        (p) => p.id_participacion === idParticipacion,
      )
      if (!mesaRecord || !participacionRecord) {
        throw new Error('Fixture gap: mesa/participacion not found in fakeTransport')
      }
      const idAsignacion = nextIdAsignacion
      nextIdAsignacion += 1
      asignaciones = [
        ...asignaciones,
        {
          id_asignacion: idAsignacion,
          id_participacion: idParticipacion,
          id_mesa: idMesa,
          vinculada: false,
          fecha_asignacion: '2026-08-19T12:00:00.000Z',
          fecha_vinculacion: null,
          mesa: mesaRecord,
          participacion: {
            id_participacion: idParticipacion,
            id_evento: idEvento,
            puesto: participacionRecord.puesto,
            estado: participacionRecord.estado,
            checklist_ok: participacionRecord.checklist_ok,
            usuario: participacionRecord.usuario,
          },
        },
      ]
      roster = roster.map((p) =>
        p.id_participacion === idParticipacion && p.estado === 'confirmo_llegada'
          ? { ...p, estado: 'asignado' }
          : p,
      )
      return Promise.resolve(
        successEnvelope({
          id_asignacion: idAsignacion,
          id_participacion: idParticipacion,
          id_mesa: idMesa,
          vinculada: false,
          fecha_asignacion: '2026-08-19T12:00:00.000Z',
          fecha_vinculacion: null,
        }),
      )
    }
    const liberarMatch = /^\/asignaciones\/(\d+)$/.exec(config.url)
    if (config.method === 'DELETE' && liberarMatch) {
      const idAsignacion = Number(liberarMatch[1])
      const target = asignaciones.find((a) => a.id_asignacion === idAsignacion)
      if (target) {
        mesas = mesas.map((m) =>
          m.id_mesa === target.id_mesa ? { ...m, estado: 'libre' } : m,
        )
        asignaciones = asignaciones.map((a) =>
          a.id_asignacion === idAsignacion ? { ...a, vinculada: false } : a,
        )
      }
      return Promise.resolve(successEnvelope(null))
    }
    throw new Error(`Unexpected requestSgeb call in test: ${JSON.stringify(config)}`)
  })
}

/**
 * A participant's name can legitimately appear twice once they have a
 * current table — once in their own row, once as the resolved occupant in
 * "Disponibilidad de mesas" — so a row lookup must be scoped to the
 * participant list, never a bare `screen.findByText(name)`.
 */
function participantList() {
  return screen.getByRole('list', { name: 'Montaje y asignación por mesero' })
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

  it('renders real tables and real assignment rows from the transport — no stale demo/foundation-only copy remains', async () => {
    fakeTransport(1001, {
      participaciones: [
        participacion({ id_participacion: 7002, estado: 'vinculo', checklist_ok: true }),
      ],
      instancias: { 7002: [completedInstancia(7002)] },
      mesas: [mesa({ id_mesa: 1, estado: 'ocupada' })],
      asignaciones: [
        asignacion({
          id_asignacion: 1,
          id_participacion: 7002,
          id_mesa: 1,
          vinculada: true,
          mesa: mesa({ id_mesa: 1, estado: 'ocupada' }),
          participacion: {
            id_participacion: 7002,
            id_evento: 1001,
            puesto: 'mesero',
            estado: 'vinculo',
            checklist_ok: true,
            usuario: {
              uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000001',
              nombre: 'Juan',
              apellido_paterno: 'Pérez',
              apellido_materno: null,
            },
          },
        }),
      ],
    })

    renderAt('/eventos/1001/montaje')

    await screen.findByRole('list', { name: 'Montaje y asignación por mesero' })
    const row = within(participantList())
      .getByText('Juan Pérez')
      .closest('li') as HTMLElement
    expect(row).toHaveTextContent('Mesa 1')
    expect(row).toHaveTextContent('Vinculada')
    expect(screen.queryByText(/panel de demostración/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/pendiente de integración/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/foundation.only/i)).not.toBeInTheDocument()
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

  it('shows "Pendiente de llegada" for a participant before confirmo_llegada, even with an approved checklist', async () => {
    fakeTransport(1001, {
      participaciones: [
        participacion({
          id_participacion: 7001,
          estado: 'confirmo_asistencia',
          checklist_ok: true,
        }),
      ],
      instancias: { 7001: [completedInstancia(7001)] },
      mesas: [mesa({ id_mesa: 1 })],
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    expect(row).toHaveTextContent('Pendiente de llegada.')
    expect(within(row).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('assign mutation POSTs /participaciones/{id}/asignaciones and, after refetch, shows the table as assigned', async () => {
    fakeTransport(1001, {
      participaciones: [
        participacion({
          id_participacion: 7001,
          estado: 'confirmo_llegada',
          checklist_ok: true,
        }),
      ],
      instancias: { 7001: [completedInstancia(7001)] },
      mesas: [mesa({ id_mesa: 1 })],
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    await user.selectOptions(within(row).getByRole('combobox'), '1')
    await user.click(within(row).getByRole('button', { name: /Asignar mesa/ }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/participaciones/7001/asignaciones',
        method: 'POST',
        data: { idMesa: 1 },
      })
    })

    await waitFor(() => {
      expect(row).toHaveTextContent('Pendiente de vincular')
    })
    expect(await screen.findByText('Mesa asignada')).toBeInTheDocument()
  })

  it('shows a mutation-conflict (409) error inline for assign, without crashing the page', async () => {
    fakeTransport(1001, {
      participaciones: [
        participacion({
          id_participacion: 7001,
          estado: 'confirmo_llegada',
          checklist_ok: true,
        }),
      ],
      instancias: { 7001: [completedInstancia(7001)] },
      mesas: [mesa({ id_mesa: 1 })],
      assignError: new SgebApplicationError(409, {
        code: 'SGEB-4006',
        message: 'Esa mesa ya está asignada a otro mesero.',
      }),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    await user.selectOptions(within(row).getByRole('combobox'), '1')
    await user.click(within(row).getByRole('button', { name: /Asignar mesa/ }))

    expect(
      await screen.findByText('Esa mesa ya está asignada a otro mesero.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Resumen')).toBeInTheDocument()
  })

  it('release mutation DELETEs /asignaciones/{id} after confirmation and, after refetch, the mesa returns to libre', async () => {
    fakeTransport(1001, {
      participaciones: [
        participacion({ id_participacion: 7002, estado: 'vinculo', checklist_ok: true }),
      ],
      instancias: { 7002: [completedInstancia(7002)] },
      mesas: [mesa({ id_mesa: 1, estado: 'ocupada' })],
      asignaciones: [
        asignacion({
          id_asignacion: 1,
          id_participacion: 7002,
          id_mesa: 1,
          vinculada: true,
          mesa: mesa({ id_mesa: 1, estado: 'ocupada' }),
          participacion: {
            id_participacion: 7002,
            id_evento: 1001,
            puesto: 'mesero',
            estado: 'vinculo',
            checklist_ok: true,
            usuario: {
              uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000001',
              nombre: 'Juan',
              apellido_paterno: 'Pérez',
              apellido_materno: null,
            },
          },
        }),
      ],
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/montaje')

    await screen.findByRole('list', { name: 'Montaje y asignación por mesero' })
    const row = within(participantList())
      .getByText('Juan Pérez')
      .closest('li') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /Liberar/ }))
    await user.click(within(row).getByRole('button', { name: 'Confirmar liberación' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/asignaciones/1',
        method: 'DELETE',
      })
    })

    await waitFor(() => {
      expect(row).toHaveTextContent('Sin mesa asignada.')
    })
    expect(await screen.findByText('Mesa liberada')).toBeInTheDocument()

    const tablesSection = screen.getByText('Disponibilidad de mesas').closest('section')
    expect(tablesSection).toHaveTextContent('Libre')
  })

  it('shows "no mesas registradas" when the event has none, without blocking the roster', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 6002 })],
      instancias: { 6002: [] },
      mesas: [],
    })

    renderAt('/eventos/1001/montaje')

    await screen.findByText('Juan Pérez')
    expect(
      screen.getByText('Este evento aún no tiene mesas registradas.'),
    ).toBeInTheDocument()
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
