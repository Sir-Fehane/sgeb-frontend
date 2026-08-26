import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { EventCubaitorPage } from '@/features/events/cubaitor/pages/EventCubaitorPage'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { SgebRequestConfig } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

/** Renders outside `SocketProvider` — see `EventDetailPage.test.tsx`'s identical stub for why. */
vi.mock('@/shared/realtime/useEventRealtimeRoom', () => ({
  useEventRealtimeRoom: vi.fn(),
}))

function authenticate(rol: 'admin' | 'capitan' | 'mesero') {
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
})

function envelope(data: unknown) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}
function envelopeList(data: unknown[]) {
  return {
    result: { code: data.length ? 'SGEB-0000' : 'SGEB-0002', message: 'ok' },
    data,
  }
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

function mockBaseRequests() {
  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === '/eventos/1001' && !config.method) {
      return Promise.resolve(envelope(EVENTO_RECORD))
    }
    if (config.url === '/eventos/1001/ordenes') {
      return Promise.resolve(envelopeList([]))
    }
    if (config.url === '/eventos/1001/alertas') {
      return Promise.resolve(envelopeList([]))
    }
    if (config.url === '/bebidas') {
      return Promise.resolve(envelopeList([]))
    }
    if (config.url === '/envases') {
      return Promise.resolve(envelopeList([]))
    }
    if (config.url === '/eventos/1001/config-dispensado') {
      return Promise.resolve(envelopeList([]))
    }
    if (config.url === '/cubaitors') {
      return Promise.resolve(envelopeList([]))
    }
    if (config.url === '/insumos') {
      return Promise.resolve(envelopeList([]))
    }
    return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
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
          <Route path="/eventos/:id/cubaitor" element={<EventCubaitorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventCubaitorPage — "Configuración" tab role gating', () => {
  it('shows the Configuración tab for a capitán session and loads its config-dispensado/cubaitors/insumos data when selected', async () => {
    authenticate('capitan')
    mockBaseRequests()
    const user = userEvent.setup()

    renderAt('/eventos/1001/cubaitor')

    const configTab = await screen.findByRole('tab', { name: 'Configuración' })
    await user.click(configTab)

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/config-dispensado' }),
    )
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/cubaitors' }),
    )
  })

  it('shows the Configuración tab for an admin session too', async () => {
    authenticate('admin')
    mockBaseRequests()

    renderAt('/eventos/1001/cubaitor')

    expect(await screen.findByRole('tab', { name: 'Configuración' })).toBeInTheDocument()
  })

  it('hides the Configuración tab entirely for a mesero session, and never fires config-dispensado/cubaitors/insumos', async () => {
    authenticate('mesero')
    mockBaseRequests()

    renderAt('/eventos/1001/cubaitor')

    await screen.findByRole('tab', { name: 'Órdenes' })
    expect(screen.queryByRole('tab', { name: 'Configuración' })).not.toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/config-dispensado' }),
    )
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/cubaitors' }),
    )
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/insumos' }),
    )
  })
})
