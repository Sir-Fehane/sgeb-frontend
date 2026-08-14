import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EventAttendancePage } from '@/features/events/attendance/pages/EventAttendancePage'
import type { ParticipacionApiRecord } from '@/features/events/attendance/services/attendanceApi'
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
  estado: 'publicado',
  creado_en: '2026-07-01T09:00:00',
}

const SELECCIONADO_RECORD: ParticipacionApiRecord = {
  id_participacion: 5003,
  puesto: 'mesero',
  estado: 'seleccionado',
  fecha_llegada: null,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000003',
    nombre: 'Mesero',
    apellido_paterno: 'Tres',
    apellido_materno: null,
    correo: 'mesero3@example.mx',
    telefono: null,
  },
}

const LLEGADA_RECORD: ParticipacionApiRecord = {
  id_participacion: 6002,
  puesto: 'barra',
  estado: 'confirmo_llegada',
  fecha_llegada: '2026-09-12T17:53:00Z',
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000006',
    nombre: 'Mesero',
    apellido_paterno: 'Seis',
    apellido_materno: null,
    correo: 'mesero6@example.mx',
    telefono: null,
  },
}

function fakeTransport(
  idEvento: number,
  options: {
    evento?: EventoApiRecord | SgebApplicationError | SgebNetworkError
    participaciones?: ParticipacionApiRecord[] | SgebNetworkError
  } = {},
) {
  const eventoUrl = `/eventos/${String(idEvento)}`
  const participacionesUrl = `/eventos/${String(idEvento)}/participaciones`

  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === eventoUrl && !config.method) {
      if (options.evento instanceof Error) return Promise.reject(options.evento)
      return Promise.resolve(successEnvelope(options.evento ?? EVENTO_RECORD))
    }
    if (config.url === participacionesUrl && !config.method) {
      if (options.participaciones instanceof Error) {
        return Promise.reject(options.participaciones)
      }
      return Promise.resolve(successEnvelope(options.participaciones ?? []))
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
          <Route path="/eventos/:id/pase-de-lista" element={<EventAttendancePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventAttendancePage', () => {
  it('renders the real roster from GET /eventos/{id}/participaciones, not development fixtures', async () => {
    fakeTransport(1001, { participaciones: [SELECCIONADO_RECORD, LLEGADA_RECORD] })

    renderAt('/eventos/1001/pase-de-lista')

    expect(await screen.findByText('Mesero Tres')).toBeInTheDocument()
    expect(screen.getByText('Mesero Seis')).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/)).not.toBeInTheDocument()
  })

  it('requests the roster for the exact numeric event id from the route, and reuses the event detail query', async () => {
    fakeTransport(1001, { participaciones: [SELECCIONADO_RECORD] })

    renderAt('/eventos/1001/pase-de-lista')

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

    renderAt('/eventos/1001/pase-de-lista')

    expect(
      screen.getByRole('status', { name: 'Cargando pase de lista' }),
    ).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed route id, without calling the transport', () => {
    renderAt('/eventos/not-a-number/pase-de-lista')

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

    renderAt('/eventos/999999/pase-de-lista')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('renders "no selected participants" when the roster is empty', async () => {
    fakeTransport(1001, { participaciones: [] })

    renderAt('/eventos/1001/pase-de-lista')

    expect(
      await screen.findByText('Aún no hay meseros seleccionados para este evento.'),
    ).toBeInTheDocument()
  })

  it('shows a safe network error message and offers a retry that refetches both queries', async () => {
    fakeTransport(1001, {
      evento: new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    })
    const user = userEvent.setup()

    renderAt('/eventos/1001/pase-de-lista')

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    fakeTransport(1001, { participaciones: [SELECCIONADO_RECORD] })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Mesero Tres')).toBeInTheDocument()
  })

  it('never issues a PATCH/POST — this screen is entirely read-only, no confirmacion-llegada, no estado mutation', async () => {
    fakeTransport(1001, { participaciones: [SELECCIONADO_RECORD, LLEGADA_RECORD] })

    renderAt('/eventos/1001/pase-de-lista')

    expect(await screen.findByText('Mesero Tres')).toBeInTheDocument()

    for (const call of vi.mocked(requestSgeb).mock.calls) {
      expect(call[0].method).toBeUndefined()
    }
  })

  it('never calls any confirmacion-llegada action and exposes no geolocation/biometric API usage', async () => {
    fakeTransport(1001, { participaciones: [SELECCIONADO_RECORD] })
    const geolocationSpy = vi.fn()
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: geolocationSpy },
      configurable: true,
    })

    renderAt('/eventos/1001/pase-de-lista')
    await screen.findByText('Mesero Tres')

    expect(geolocationSpy).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: /Confirmar|Marcar|Aprobar/ }),
    ).not.toBeInTheDocument()

    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    })
  })
})
