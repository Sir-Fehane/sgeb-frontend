import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EventCreatePage } from '@/features/events/pages/EventCreatePage'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import type { SalonApiRecord } from '@/features/events/services/salonesApi'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { requestSgeb, type SgebRequestConfig } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
})

function authenticate() {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: { sub: 'uuid-test-capitan', rol: 'capitan' },
  })
}

const SALON_RECORD: SalonApiRecord = {
  id_salon: 1,
  nombre: 'Salón Roble',
  calle: 'Calle 1',
  cp: '00000',
  colonia: 'Centro',
  ciudad: 'CDMX',
  estado: 'CDMX',
  latitud: 19.4,
  longitud: -99.1,
  capacidad_max_mesas: 40,
  capacidad_personas: 200,
  activo: true,
}

const CREATED_RECORD: EventoApiRecord = {
  id_evento: 5001,
  id_salon: 1,
  titulo: 'Evento válido de prueba',
  tipo: 'social',
  fecha: '2099-01-10',
  hora_presentacion: '16:00',
  inicio: '2099-01-10T18:00:00',
  fin: null,
  cupo_meseros: 5,
  num_mesas: 10,
  tarifa_por_mesero: 400,
  radio_geocerca_m: 150,
  estado: 'borrador',
  creado_en: '2099-01-01T00:00:00',
}

function mockTransport(options: { salones?: SalonApiRecord[] } = {}) {
  const { salones = [SALON_RECORD] } = options
  vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
    if (config.url === '/salones' && (config.method ?? 'GET') === 'GET') {
      return Promise.resolve({
        result: { code: salones.length === 0 ? 'SGEB-0002' : 'SGEB-0000', message: 'ok' },
        data: salones,
      })
    }
    if (config.url === '/eventos' && config.method === 'POST') {
      return Promise.resolve({
        result: { code: 'SGEB-0001', message: 'Creado.' },
        data: CREATED_RECORD,
      })
    }
    return Promise.reject(new Error(`Unhandled request in test: ${config.url}`))
  })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/eventos/nuevo']}>
        <Routes>
          <Route path="/eventos/nuevo" element={<EventCreatePage />} />
          <Route path="/eventos/:id" element={<div>Detalle del evento</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/^Título/), 'Evento válido de prueba')
  await user.selectOptions(screen.getByLabelText(/^Tipo de evento/), 'social')
  await user.type(screen.getByLabelText(/^Fecha del evento/), '2099-01-10')
  await user.type(screen.getByLabelText(/^Hora de presentación/), '16:00')
  await user.type(screen.getByLabelText(/^Fecha y hora de inicio/), '2099-01-10T18:00')
  await user.selectOptions(screen.getByLabelText(/^Salón/), '1')
  await user.type(screen.getByLabelText(/^Número de mesas/), '10')
  await user.type(screen.getByLabelText(/^Cupo de meseros/), '5')
  await user.type(screen.getByLabelText(/^Radio de geocerca/), '150')
  await user.type(screen.getByLabelText(/^Tarifa por mesero/), '400')
}

describe('EventCreatePage', () => {
  it('shows a session-required message when not authenticated, and never attempts POST /eventos', () => {
    mockTransport()
    renderPage()

    expect(screen.getByText('Inicia sesión para crear un evento.')).toBeInTheDocument()
    // `useSalonesQuery` still runs (React hooks execute before this early
    // return), but no create attempt is possible without a session — there
    // is no form to submit here at all.
    expect(
      vi.mocked(requestSgeb).mock.calls.some((call) => call[0].method === 'POST'),
    ).toBe(false)
  })

  it('renders the live GET /salones options in the salón picker', async () => {
    authenticate()
    mockTransport()
    renderPage()

    await screen.findByLabelText(/^Título/)
    expect(screen.getByRole('option', { name: /Salón Roble/ })).toBeInTheDocument()
  })

  it('shows a warning and no salón options when GET /salones returns empty', async () => {
    authenticate()
    mockTransport({ salones: [] })
    renderPage()

    expect(await screen.findByText('No hay salones disponibles')).toBeInTheDocument()
  })

  it('submits POST /eventos with the session uuid as uuidCapitan and camelCase fields, then navigates to the real detail page', async () => {
    authenticate()
    mockTransport()
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    await waitFor(() => {
      expect(
        vi.mocked(requestSgeb).mock.calls.some((call) => call[0].url === '/eventos'),
      ).toBe(true)
    })
    const createCall = vi
      .mocked(requestSgeb)
      .mock.calls.find((call) => call[0].url === '/eventos')
    expect(createCall?.[0].method).toBe('POST')
    expect(createCall?.[0].data).toMatchObject({
      uuidCapitan: 'uuid-test-capitan',
      idSalon: 1,
      titulo: 'Evento válido de prueba',
      tipo: 'social',
      horaPresentacion: '16:00',
      cupoMeseros: 5,
      numMesas: 10,
      tarifaPorMesero: 400,
      radioGeocercaM: 150,
    })
    expect(await screen.findByText('Detalle del evento')).toBeInTheDocument()
  })

  it('never sends an estado field, and never auto-publishes (only one POST /eventos call, no PATCH estado)', async () => {
    authenticate()
    mockTransport()
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    await waitFor(() => expect(requestSgeb).toHaveBeenCalled())
    const postCalls = vi
      .mocked(requestSgeb)
      .mock.calls.filter((call) => call[0].method === 'POST')
    expect(postCalls).toHaveLength(1)
    expect(postCalls[0]?.[0].data).not.toHaveProperty('estado')
    expect(
      vi.mocked(requestSgeb).mock.calls.some((call) => call[0].url.includes('/estado')),
    ).toBe(false)
  })

  it('creating a salón inline calls POST /salones and auto-selects it in the form', async () => {
    authenticate()
    mockTransport({ salones: [] })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('No hay salones disponibles')
    await user.click(
      screen.getByRole('button', { name: '¿No encuentras tu salón? Crear uno nuevo' }),
    )

    await user.type(screen.getByLabelText(/^Nombre/), 'Salón Nuevo')
    await user.type(screen.getByLabelText(/^Calle/), 'Av. Reforma 100')
    await user.type(screen.getByLabelText(/^Código postal/), '06600')
    await user.type(screen.getByLabelText(/^Colonia/), 'Juárez')
    await user.type(screen.getByLabelText(/^Ciudad/), 'CDMX')
    await user.type(screen.getByLabelText(/^Estado \(dirección\)/), 'CDMX')
    await user.type(screen.getByLabelText(/^Latitud/), '19.42')
    await user.type(screen.getByLabelText(/^Longitud/), '-99.16')
    await user.type(screen.getByLabelText(/^Capacidad máxima de mesas/), '30')
    await user.type(screen.getByLabelText(/^Capacidad de personas/), '150')

    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/salones' && config.method === 'POST') {
        return Promise.resolve({
          result: { code: 'SGEB-0001', message: 'Creado.' },
          data: {
            id_salon: 7,
            ...(config.data as object),
            activo: true,
          } as SalonApiRecord,
        })
      }
      if (config.url === '/salones') {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: [{ id_salon: 7, nombre: 'Salón Nuevo', capacidad_max_mesas: 30 }],
        })
      }
      return Promise.reject(new Error(`Unhandled request in test: ${config.url}`))
    })

    await user.click(screen.getByRole('button', { name: 'Crear salón' }))

    await waitFor(() => {
      const select = screen.getByLabelText<HTMLSelectElement>(/^Salón/)
      expect(select.value).toBe('7')
    })
  })
})
