import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { TeamSelectionPage } from '@/features/events/team-selection/pages/TeamSelectionPage'
import type { ParticipacionApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
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

const CANDIDATO_RECORD: ParticipacionApiRecord = {
  id_participacion: 5001,
  puesto: 'mesero',
  estado: 'aparto',
  checklist_ok: false,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000001',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: null,
    correo: 'juan@example.mx',
    telefono: null,
  },
}

const SELECCIONADO_RECORD: ParticipacionApiRecord = {
  id_participacion: 5002,
  puesto: 'barra',
  estado: 'seleccionado',
  checklist_ok: false,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000002',
    nombre: 'Ana',
    apellido_paterno: 'García',
    apellido_materno: 'López',
    correo: 'ana@example.mx',
    telefono: null,
  },
}

/**
 * A small stateful fake of the SGEB transport, scoped to one event id.
 * Unlike a set of fixed per-call responses, a successful PATCH here
 * actually mutates the in-memory roster — so the roster refetch the
 * mutation's cache invalidation triggers reflects the real new state,
 * exactly like the pinned backend, instead of racing a manually-swapped
 * mock.
 */
function fakeTransport(
  idEvento: number,
  options: {
    evento?: EventoApiRecord | SgebApplicationError | SgebNetworkError
    participaciones?: ParticipacionApiRecord[]
    selectError?: SgebApplicationError
  } = {},
) {
  let roster = options.participaciones ? [...options.participaciones] : []
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
    const patchMatch = /^\/participaciones\/(\d+)\/estado$/.exec(config.url)
    if (config.method === 'PATCH' && patchMatch) {
      if (options.selectError) {
        return Promise.reject(options.selectError)
      }
      const id = Number(patchMatch[1])
      roster = roster.map((participant) =>
        participant.id_participacion === id
          ? { ...participant, estado: 'seleccionado' as const }
          : participant,
      )
      const updated = roster.find((participant) => participant.id_participacion === id)
      if (!updated) return Promise.resolve(successEnvelope(null))
      // The pinned backend's `cambiarEstado` does not preload `usuario`
      // (unlike `listarPorEvento`, which the GET branch above still
      // serves unchanged) — the PATCH response omits it entirely.
      const { usuario: _usuario, ...withoutUsuario } = updated
      return Promise.resolve(successEnvelope(withoutUsuario))
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
          <Route path="/eventos/:id/equipo" element={<TeamSelectionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TeamSelectionPage', () => {
  it('renders the real roster from GET /eventos/{id}/participaciones, not development fixtures', async () => {
    fakeTransport(1001, { participaciones: [CANDIDATO_RECORD, SELECCIONADO_RECORD] })

    renderAt('/eventos/1001/equipo')

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana García López')).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/)).not.toBeInTheDocument()
  })

  it('requests the roster for the exact numeric event id from the route, and reuses the event detail query', async () => {
    fakeTransport(1001, { participaciones: [CANDIDATO_RECORD] })

    renderAt('/eventos/1001/equipo')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/eventos/1001' }),
      )
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/eventos/1001/participaciones' }),
      )
    })
  })

  it('shows a loading state while either request is pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderAt('/eventos/1001/equipo')

    expect(
      screen.getByRole('status', { name: 'Cargando equipo del evento' }),
    ).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed route id, without calling the transport', () => {
    renderAt('/eventos/not-a-number/equipo')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('renders the unavailable state (not the generic error state) for SGEB-3001 on the event, driven by the event query alone', async () => {
    fakeTransport(999999, {
      evento: new SgebApplicationError(404, {
        code: 'SGEB-3001',
        message: 'No encontramos la información solicitada.',
      }),
      participaciones: [],
    })

    renderAt('/eventos/999999/equipo')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('shows a safe network error message and offers a retry that refetches both queries', async () => {
    fakeTransport(1001, {
      evento: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/equipo')

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    fakeTransport(1001, { participaciones: [CANDIDATO_RECORD] })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
  })

  it('selecting a candidate PATCHes /participaciones/{id}/estado and, after refetch, moves them into the selected list', async () => {
    fakeTransport(1001, { participaciones: [CANDIDATO_RECORD] })
    const user = userEvent.setup()

    renderAt('/eventos/1001/equipo')

    const button = await screen.findByRole('button', { name: 'Seleccionar a Juan Pérez' })
    await user.click(button)

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/participaciones/5001/estado',
        method: 'PATCH',
        data: { estado: 'seleccionado' },
      })
    })

    // The fake transport mutated its own roster on the PATCH above, so the
    // mutation's cache invalidation refetches real updated state — no
    // manual mock reassignment needed here.
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Seleccionar a Juan Pérez' }),
      ).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0)
  })

  it('a repeated click on the same candidate while selecting only sends one PATCH', async () => {
    fakeTransport(1001, { participaciones: [CANDIDATO_RECORD] })

    renderAt('/eventos/1001/equipo')

    const button = await screen.findByRole('button', { name: 'Seleccionar a Juan Pérez' })
    // Two synchronous clicks (not two separately-awaited `user.click`s) so
    // the second one lands before any mutation microtask has a chance to
    // resolve — this is what actually exercises the `rowStatuses[...] ===
    // 'selecting'` guard in `TeamSelectionPage`.
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Seleccionar a Juan Pérez' }),
      ).not.toBeInTheDocument()
    })

    expect(
      vi.mocked(requestSgeb).mock.calls.filter((call) => call[0].method === 'PATCH'),
    ).toHaveLength(1)
  })

  it('shows the backend-approved error message inline on the row when selection fails, never technical_message', async () => {
    fakeTransport(1001, {
      participaciones: [CANDIDATO_RECORD],
      selectError: new SgebApplicationError(409, {
        code: 'SGEB-4011',
        message:
          'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
        technical_message: 'transición inválida: detalle interno',
      }),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/equipo')

    const button = await screen.findByRole('button', { name: 'Seleccionar a Juan Pérez' })
    await user.click(button)

    expect(
      await screen.findByText(
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/detalle interno/)).not.toBeInTheDocument()
  })

  it('never sends idParticipacion or any other field besides estado in the PATCH body', async () => {
    fakeTransport(1001, { participaciones: [CANDIDATO_RECORD] })
    const user = userEvent.setup()

    renderAt('/eventos/1001/equipo')

    const button = await screen.findByRole('button', { name: 'Seleccionar a Juan Pérez' })
    await user.click(button)

    await waitFor(() => {
      const patchCall = vi
        .mocked(requestSgeb)
        .mock.calls.find((call) => call[0].method === 'PATCH')
      expect(patchCall?.[0].data).toEqual({ estado: 'seleccionado' })
    })
  })
})
