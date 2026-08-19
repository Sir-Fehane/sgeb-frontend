import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useController, type Control } from 'react-hook-form'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreateSalonFormValues } from '@/features/events/schemas/salonCreateSchema'
import { EventCreatePage } from '@/features/events/pages/EventCreatePage'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import type { SalonApiRecord } from '@/features/events/services/salonesApi'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { requestSgeb, type SgebRequestConfig } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

/**
 * Neither `SalonLocationPicker` (address → geocoding → map → marker) nor
 * `EventGeofenceMapPreview` (the geofence circle preview, shown once a
 * salón is selected) are this page's concern — both have their own
 * dedicated coverage (`SalonLocationPicker.test.tsx`,
 * `EventGeofenceMapPreview.test.tsx`) and both pull in real `mapbox-gl`,
 * which cannot initialize WebGL under jsdom. Stubbed here so this page's
 * own tests (submission, salón selection, session wiring) never trip over
 * that.
 */
vi.mock('@/shared/components/ui/mapbox-map', () => ({
  MapboxMap: () => <div data-testid="mapbox-map-stub" />,
}))

/**
 * `SalonLocationPicker` (address → geocoding → map → marker) has its own
 * dedicated coverage (`SalonLocationPicker.test.tsx`) and pulls in real
 * `mapbox-gl`, which cannot initialize WebGL under jsdom. This page's tests
 * only care that `latitud`/`longitud` reach the real `POST /salones`
 * payload — stubbed here as plain labeled number inputs bound via
 * `useController`, the same RHF wiring the real picker uses.
 */
vi.mock('@/features/events/components/SalonLocationPicker', () => ({
  SalonLocationPicker: ({ control }: { control: Control<CreateSalonFormValues> }) => {
    const latitud = useController({ control, name: 'latitud' })
    const longitud = useController({ control, name: 'longitud' })
    return (
      <div>
        <label htmlFor="stub-latitud">Latitud</label>
        <input
          id="stub-latitud"
          type="number"
          step="any"
          value={Number.isNaN(latitud.field.value) ? '' : latitud.field.value}
          onChange={(event) => {
            latitud.field.onChange(event.target.valueAsNumber)
          }}
        />
        <label htmlFor="stub-longitud">Longitud</label>
        <input
          id="stub-longitud"
          type="number"
          step="any"
          value={Number.isNaN(longitud.field.value) ? '' : longitud.field.value}
          onChange={(event) => {
            longitud.field.onChange(event.target.valueAsNumber)
          }}
        />
      </div>
    )
  },
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

/** Reveals whether the route it lands on carried `{ justCreated: true }` router state — reused by the "hands off one-time feedback state" test below. */
function DetailPlaceholder() {
  const location = useLocation()
  const justCreated = Boolean(
    (location.state as { justCreated?: boolean } | null)?.justCreated,
  )
  return <div>Detalle del evento — justCreated: {String(justCreated)}</div>
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
          <Route path="/eventos/:id" element={<DetailPlaceholder />} />
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
  await user.type(screen.getByLabelText(/^Hora de inicio del evento/), '18:00')
  await user.selectOptions(screen.getByLabelText(/^Salón/), '1')
  await user.type(screen.getByLabelText(/^Número de mesas/), '10')
  await user.type(screen.getByLabelText(/^Cupo de meseros/), '5')
  await user.type(screen.getByLabelText(/^Radio permitido para registrar llegada/), '150')
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
      fecha: '2099-01-10',
      horaPresentacion: '16:00',
      inicio: '2099-01-10T18:00',
      cupoMeseros: 5,
      numMesas: 10,
      tarifaPorMesero: 400,
      radioGeocercaM: 150,
    })
    // Navigates with the one-time `justCreated` route-state flag —
    // `EventDetailPage` reads and immediately consumes it; see that
    // page's own tests for the full consume/no-replay behavior.
    expect(
      await screen.findByText('Detalle del evento — justCreated: true'),
    ).toBeInTheDocument()
  })

  it('asks for the event date once — no separate inicio-date input exists — and derives inicio from fecha + the selected start time', async () => {
    authenticate()
    mockTransport()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByLabelText(/^Fecha del evento/)).toHaveAttribute(
      'type',
      'date',
    )
    expect(screen.queryByLabelText(/^Fecha y hora de inicio/)).not.toBeInTheDocument()
    const horaInicioInput = screen.getByLabelText(/^Hora de inicio del evento/)
    expect(horaInicioInput).toHaveAttribute('type', 'time')

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    await waitFor(() => {
      const createCall = vi
        .mocked(requestSgeb)
        .mock.calls.find(
          (call) => call[0].url === '/eventos' && call[0].method === 'POST',
        )
      expect(createCall?.[0].data).toMatchObject({
        fecha: '2099-01-10',
        inicio: '2099-01-10T18:00',
      })
    })
  })

  it('changing fecha produces an inicio whose date matches the new fecha, keeping the selected start time', async () => {
    authenticate()
    mockTransport()
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user)
    const fechaInput = screen.getByLabelText(/^Fecha del evento/)
    await user.clear(fechaInput)
    await user.type(fechaInput, '2099-02-20')
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    await waitFor(() => {
      const createCall = vi
        .mocked(requestSgeb)
        .mock.calls.find(
          (call) => call[0].url === '/eventos' && call[0].method === 'POST',
        )
      expect(createCall?.[0].data).toMatchObject({
        fecha: '2099-02-20',
        inicio: '2099-02-20T18:00',
      })
    })
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

  async function fillSalonCreateForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^Nombre/), 'Salón Nuevo')
    await user.type(screen.getByLabelText(/^Calle/), 'Av. Reforma 100')
    await user.type(screen.getByLabelText(/^Código postal/), '06600')
    await user.type(screen.getByLabelText(/^Colonia/), 'Juárez')
    await user.type(screen.getByLabelText(/^Ciudad/), 'CDMX')
    await user.type(screen.getByLabelText(/^Estado/), 'CDMX')
    await user.type(screen.getByLabelText(/^Latitud/), '19.42')
    await user.type(screen.getByLabelText(/^Longitud/), '-99.16')
    await user.type(screen.getByLabelText(/^Capacidad máxima de mesas/), '30')
    await user.type(screen.getByLabelText(/^Capacidad de personas/), '150')
  }

  it('actually selects the newly-created salón — even before the background list refetch resolves — and submits that exact id for the event (regression: manual testing found the select silently failing to update)', async () => {
    authenticate()
    mockTransport({ salones: [] })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('No hay salones disponibles')
    await user.click(
      screen.getByRole('button', { name: '¿No encuentras tu salón? Crear uno nuevo' }),
    )
    await fillSalonCreateForm(user)

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
        // The real, unawaited background refetch `invalidateQueries`
        // schedules — deliberately never resolves in this test, to prove
        // the select's real value does not depend on it (only on the
        // mutation's own synchronous cache write).
        return new Promise(() => undefined)
      }
      if (config.url === '/eventos' && config.method === 'POST') {
        return Promise.resolve({
          result: { code: 'SGEB-0001', message: 'Creado.' },
          data: { ...CREATED_RECORD, id_salon: 7 },
        })
      }
      return Promise.reject(new Error(`Unhandled request in test: ${config.url}`))
    })

    await user.click(screen.getByRole('button', { name: 'Crear salón' }))

    const select = await screen.findByLabelText<HTMLSelectElement>(/^Salón/)
    await waitFor(() => {
      expect(select.value).toBe('7')
    })
    // The real option backing that value actually exists — not just a
    // numeric match on an empty/absent option.
    expect(
      within(select).getByRole('option', { name: /Salón Nuevo/ }),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Título/), 'Evento válido de prueba')
    await user.selectOptions(screen.getByLabelText(/^Tipo de evento/), 'social')
    await user.type(screen.getByLabelText(/^Fecha del evento/), '2099-01-10')
    await user.type(screen.getByLabelText(/^Hora de presentación/), '16:00')
    await user.type(screen.getByLabelText(/^Hora de inicio del evento/), '18:00')
    await user.type(screen.getByLabelText(/^Número de mesas/), '10')
    await user.type(screen.getByLabelText(/^Cupo de meseros/), '5')
    await user.type(
      screen.getByLabelText(/^Radio permitido para registrar llegada/),
      '150',
    )
    await user.type(screen.getByLabelText(/^Tarifa por mesero/), '400')
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    await waitFor(() => {
      const createCall = vi
        .mocked(requestSgeb)
        .mock.calls.find(
          (call) => call[0].url === '/eventos' && call[0].method === 'POST',
        )
      expect(createCall?.[0].data).toMatchObject({ idSalon: 7 })
    })
  })

  it('shows a branded floating success toast naming the created salón, only once it is created and selected', async () => {
    authenticate()
    mockTransport({ salones: [] })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('No hay salones disponibles')
    await user.click(
      screen.getByRole('button', { name: '¿No encuentras tu salón? Crear uno nuevo' }),
    )
    await fillSalonCreateForm(user)

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

    expect(screen.queryByText('Salón creado')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Crear salón' }))

    // The select is already correctly populated by the time the toast
    // appears — the message never claims a selection that hasn't happened.
    await waitFor(() => {
      expect(screen.getByLabelText<HTMLSelectElement>(/^Salón/).value).toBe('7')
    })
    expect(await screen.findByText('Salón creado')).toBeInTheDocument()
    expect(
      screen.getByText('Salón Nuevo fue creado y seleccionado para este evento.'),
    ).toBeInTheDocument()
    // The creation form collapses on success, so this toast can't be
    // mistaken for something still pending.
    expect(screen.queryByRole('button', { name: 'Crear salón' })).not.toBeInTheDocument()
  })

  it('reopening "crear salón" clears the previous success toast, and a failed second attempt never shows a stale one', async () => {
    authenticate()
    mockTransport({ salones: [] })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('No hay salones disponibles')
    await user.click(
      screen.getByRole('button', { name: '¿No encuentras tu salón? Crear uno nuevo' }),
    )
    await fillSalonCreateForm(user)
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
    await screen.findByText('Salón creado')

    await user.click(
      screen.getByRole('button', { name: '¿No encuentras tu salón? Crear uno nuevo' }),
    )
    expect(screen.queryByText('Salón creado')).not.toBeInTheDocument()

    await fillSalonCreateForm(user)
    vi.mocked(requestSgeb).mockImplementation((config: SgebRequestConfig) => {
      if (config.url === '/salones' && config.method === 'POST') {
        return Promise.reject(new Error('boom'))
      }
      return Promise.resolve({
        result: { code: 'SGEB-0000', message: 'ok' },
        data: [{ id_salon: 7, nombre: 'Salón Nuevo', capacidad_max_mesas: 30 }],
      })
    })
    await user.click(screen.getByRole('button', { name: 'Crear salón' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Crear salón' })).toBeInTheDocument()
    })
    expect(screen.queryByText('Salón creado')).not.toBeInTheDocument()
  })

  it('opens the Salón form in a focused dialog — not inline — and preserves the Event form while it is open and after canceling', async () => {
    authenticate()
    mockTransport()
    const user = userEvent.setup()
    renderPage()

    const tituloInput = await screen.findByLabelText(/^Título/)
    await user.type(tituloInput, 'Borrador de evento')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '¿No encuentras tu salón? Crear uno nuevo' }),
    )

    const dialog = screen.getByRole('dialog', { name: 'Crear salón' })
    expect(within(dialog).getByLabelText(/^Nombre/)).toBeInTheDocument()
    // The Salón form no longer renders inline alongside the Event form.
    expect(within(dialog).queryByLabelText(/^Título/)).not.toBeInTheDocument()
    // The Event form behind the dialog is inert while it's open.
    expect(tituloInput.closest('[inert]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(tituloInput.closest('[inert]')).toBeNull()
    expect(tituloInput).toHaveValue('Borrador de evento')
  })
})
