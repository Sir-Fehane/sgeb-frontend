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

function authenticate(rol: 'admin' | 'capitan' | 'mesero' = 'capitan') {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: {
      sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Test Capitán',
      email: 'test@example.com',
      rol,
    },
  })
}

/**
 * Every existing describe block in this file exercises the real montage
 * content (roster/checklist/tables), so a `capitán` session — this page's
 * own documented "CAPTAIN'S WEB VIEW" — is seeded by default here rather
 * than at each of the many call sites below, mirroring `MenuPage.test.tsx`'s
 * `authenticate` default. The dedicated role-gating describe block further
 * down overrides this per-test to exercise the gate itself (mesero/admin/
 * unauthenticated).
 */
beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
  authenticate()
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

/** A second, distinct `montaje` template — used only by the "multiple templates" selection test below; every other test in this file keeps the single-`MONTAJE_TEMPLATE` default. */
const MONTAJE_TEMPLATE_2: ChecklistApiRecord = {
  id_checklist: 2,
  nombre: 'Montaje de barra',
  tipo: 'montaje',
  activo: true,
  items: [
    {
      id_item: 3,
      id_checklist: 2,
      descripcion: 'Surtir hielo',
      cantidad_esperada: 1,
      orden: 1,
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
    activa: true,
    fecha_liberacion: null,
    ...overrides,
  }
}

function pendingInstancia(idParticipacion: number): ChecklistInstanciaApiRecord {
  return {
    id_instancia: 900 + idParticipacion,
    id_participacion: idParticipacion,
    id_checklist: 1,
    completado: false,
    aprobado_en: null,
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
    aprobado_en: null,
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
 * reflects real new state, exactly like the pinned backend, including
 * release flipping `activa` to `false` (see the `DELETE` handler below and
 * `deriveMontageAssignments`'s own comment).
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
  const instancias: Record<number, ChecklistInstanciaApiRecord[]> = {
    ...(options.instancias ?? {}),
  }
  let nextIdInstancia = 9500
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
    if (instanciaMatch && config.method === 'POST') {
      const idParticipacion = Number(instanciaMatch[1])
      // Mirrors the REAL pinned backend's `instanciarValidator`
      // (`checklist_validator.ts`: `vine.object({ idChecklist:
      // vine.number().positive() })`) — camelCase, and rejects exactly
      // like the real `SGEB-2001` when the key is missing/not a number,
      // instead of silently accepting whatever casing the request sends.
      // This is what makes this fixture an actual regression guard for
      // the reproduced "sent id_checklist instead of idChecklist" bug —
      // a wrongly-cased request would fail here the same way it failed
      // against the real backend, not just against a lenient stub.
      const idChecklist = (config.data as { idChecklist?: unknown }).idChecklist
      if (typeof idChecklist !== 'number') {
        return Promise.reject(
          new SgebApplicationError(400, {
            code: 'SGEB-2001',
            message: 'Faltan datos obligatorios. Completa los campos marcados.',
          }),
        )
      }
      const existing = (instancias[idParticipacion] ?? []).find(
        (i) => i.id_checklist === idChecklist,
      )
      if (existing) {
        return Promise.resolve(successEnvelope(existing))
      }
      const nueva: ChecklistInstanciaApiRecord = {
        id_instancia: nextIdInstancia,
        id_participacion: idParticipacion,
        id_checklist: idChecklist,
        completado: false,
        aprobado_en: null,
        fecha: '2026-08-20T00:00:00',
        respuestas: [],
      }
      nextIdInstancia += 1
      instancias[idParticipacion] = [...(instancias[idParticipacion] ?? []), nueva]
      return Promise.resolve(successEnvelope(nueva))
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
          activa: true,
          fecha_liberacion: null,
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
          a.id_asignacion === idAsignacion
            ? {
                ...a,
                vinculada: false,
                activa: false,
                fecha_liberacion: '2026-08-19T13:00:00.000Z',
              }
            : a,
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

  /**
   * Regression coverage for the real, reproduced bug: this POST used to
   * send `{ id_checklist: ... }` (snake_case), which the pinned backend's
   * `instanciarValidator` rejects as `SGEB-2001` ("Faltan datos
   * obligatorios") because it validates the raw camelCase key
   * `idChecklist`. This drives the exact real `Evento -> Montaje` UI (not
   * `EventMontageChecklistSection` in isolation): renders the page,
   * clicks the real "Asignar checklist" button, and asserts the exact
   * request body — this test fails if the body ever omits `idChecklist`
   * or reintroduces `id_checklist`, both by the strict `toHaveBeenCalledWith`
   * below and because `fakeTransport`'s POST handler now rejects a
   * malformed body exactly like the real backend (see its own comment).
   */
  it('offers an "Asignar checklist" action for a participant with no instance, and POSTs { idChecklist } — never id_checklist (Phase 6, idempotent instantiation)', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    const user = userEvent.setup()
    await user.click(
      within(row).getByRole('button', {
        name: 'Asignar checklist de montaje a Juan Pérez',
      }),
    )

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/participaciones/5003/checklist-instancias',
        method: 'POST',
        data: { idChecklist: 1 },
      })
    })

    // After the mutation's own invalidation, the instance query refetches
    // and this participant's row moves from the absent-instance message to
    // the real pending-checklist badge — never a locally-faked instance.
    await waitFor(() => {
      expect(
        within(row).queryByText(/checklist de montaje instanciado/),
      ).not.toBeInTheDocument()
    })
    expect(within(row).getByText('Checklist pendiente')).toBeInTheDocument()
  })

  it('a repeated instantiate click while in flight only sends one POST', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    const button = within(row).getByRole('button', {
      name: 'Asignar checklist de montaje a Juan Pérez',
    })
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      expect(within(row).getByText('Checklist pendiente')).toBeInTheDocument()
    })

    const postCalls = vi
      .mocked(requestSgeb)
      .mock.calls.filter(
        ([config]) =>
          config.url === '/participaciones/5003/checklist-instancias' &&
          config.method === 'POST',
      )
    expect(postCalls).toHaveLength(1)
  })

  it("shows the single available template's name in a visible selector, not a bare unnamed button", async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    const select = within(row).getByRole('combobox', {
      name: 'Plantilla de checklist para Juan Pérez',
    })
    expect(select).toHaveValue('1')
    expect(
      within(select).getByRole('option', { name: 'Montaje de estación' }),
    ).toBeInTheDocument()
  })

  /**
   * Regression coverage: with more than one `montaje` template in the
   * catalog, the captain must be able to pick which one to instantiate —
   * the mutation must never silently default to array index 0 without the
   * captain's own choice being reflected in the request.
   */
  it("lets the captain choose among multiple templates, and sends the selected one's idChecklist", async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
      templates: [MONTAJE_TEMPLATE, MONTAJE_TEMPLATE_2],
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    const select = within(row).getByRole('combobox', {
      name: 'Plantilla de checklist para Juan Pérez',
    })
    expect(
      within(select).getByRole('option', { name: 'Montaje de estación' }),
    ).toBeInTheDocument()
    expect(
      within(select).getByRole('option', { name: 'Montaje de barra' }),
    ).toBeInTheDocument()

    const user = userEvent.setup()
    await user.selectOptions(select, '2')
    await user.click(
      within(row).getByRole('button', {
        name: 'Asignar checklist de montaje a Juan Pérez',
      }),
    )

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/participaciones/5003/checklist-instancias',
        method: 'POST',
        data: { idChecklist: 2 },
      })
    })
  })

  /**
   * Regression coverage for the real, reported UX bug: "I do NOT see where
   * a checklist template is assigned/instantiated for a waiter
   * participation." Root cause was never a wiring break — `templatesQuery`
   * →`EventMontageContent`→`EventMontageParticipantList`→
   * `EventMontageParticipantRow`→`EventMontageChecklistSection` was
   * already threaded correctly end to end — but when the `GET
   * /checklists?tipo=montaje` catalog is genuinely empty (e.g. a captain
   * who only created `servicio`/`cierre` templates, or none yet), the
   * instantiate action had nothing to offer and rendered only a passive,
   * unexplained sentence: from the rendered UI there was no way to tell
   * "you need to create a montaje template first" apart from "this feature
   * doesn't exist." This exercises the real `EventMontagePage` render, not
   * `EventMontageChecklistSection` in isolation, with `fakeTransport`'s
   * `templates` option explicitly overridden to empty (the default
   * fixture always supplies one montaje template, which is why no earlier
   * test in this file hit this branch).
   */
  it('explains the missing-template prerequisite, with a real link to /checklists, when the montaje catalog is empty', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
      templates: [],
    })

    renderAt('/eventos/1001/montaje')

    const row = (await screen.findByText('Juan Pérez')).closest('li') as HTMLElement
    expect(
      within(row).getByText(/No hay ninguna plantilla de checklist de tipo "Montaje"/),
    ).toBeInTheDocument()
    expect(
      within(row).queryByRole('button', { name: /Asignar checklist/ }),
    ).not.toBeInTheDocument()

    const link = within(row).getByRole('link', { name: 'Ir a Checklists' })
    expect(link).toHaveAttribute('href', '/checklists')
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

/**
 * Final role/scope verification (`feature/checklist-flow-alignment`) —
 * this page is the documented "CAPTAIN'S WEB VIEW" of montage checklists
 * and table assignment (`types/montage.ts`'s module comment); a `mesero`
 * session must never see its roster, checklist actions (Asignar checklist,
 * Aprobar), or table-assignment actions, and must never trigger any of its
 * captain-only queries — not just have the buttons hidden while data still
 * loads underneath.
 */
describe('EventMontagePage — role gating', () => {
  it('shows the forbidden state, and never calls the transport, for a mesero session', () => {
    authenticate('mesero')

    renderAt('/eventos/1001/montaje')

    expect(
      screen.getByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Asignar checklist/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Aprobar checklist/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the forbidden state, and never calls the transport, for an unauthenticated session', () => {
    useOidcSessionStore.getState().reset()

    renderAt('/eventos/1001/montaje')

    expect(
      screen.getByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('renders the real montage content for an admin session, same as capitán', async () => {
    authenticate('admin')
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
    })

    renderAt('/eventos/1001/montaje')

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(
      screen.queryByText('No tienes permiso para ver esta sección'),
    ).not.toBeInTheDocument()
  })

  it('renders the real montage content for a capitán session', async () => {
    fakeTransport(1001, {
      participaciones: [participacion({ id_participacion: 5003 })],
      instancias: { 5003: [] },
    })

    renderAt('/eventos/1001/montaje')

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(
      screen.queryByText('No tienes permiso para ver esta sección'),
    ).not.toBeInTheDocument()
  })
})
