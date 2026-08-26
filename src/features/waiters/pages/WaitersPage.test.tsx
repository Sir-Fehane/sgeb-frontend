import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { WaitersPage } from '@/features/waiters/pages/WaitersPage'
import type { InvitacionApiRecord } from '@/features/waiters/services/invitationsApi'
import type { RolApiRecord } from '@/features/waiters/services/rolesApi'
import type { UsuarioApiRecord } from '@/features/waiters/services/waitersApi'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

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

const WAITER_RECORD: UsuarioApiRecord = {
  uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombre: 'Juana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'López',
  correo: 'juana.perez@example.com',
  telefono: '+52 871 000 0001',
  activo: true,
}

const ROLE_RECORDS: RolApiRecord[] = [
  { id_rol: 1, nombre: 'admin', descripcion: null, activo: true },
  { id_rol: 2, nombre: 'capitan', descripcion: null, activo: true },
  { id_rol: 3, nombre: 'mesero', descripcion: null, activo: true },
]

const INVITATION_RECORD: InvitacionApiRecord = {
  id_invitacion: 10,
  id_rol_destino: 3,
  nombre: 'Pedro',
  apellido_paterno: 'Gómez',
  apellido_materno: null,
  correo: 'pedro.gomez@example.com',
  telefono: null,
  estado: 'pendiente',
  expira_en: '2026-08-08T09:00:00',
  id_usuario_creado: null,
  usada_en: null,
  creado_en: '2026-08-05T09:00:00',
}

function envelopeList(data: unknown[]) {
  return {
    result: { code: data.length ? 'SGEB-0000' : 'SGEB-0002', message: 'ok' },
    data,
  }
}
function envelope(data: unknown) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

interface MockOverrides {
  waiters?: UsuarioApiRecord[]
  invitations?: InvitacionApiRecord[]
  onCreateInvitation?: (body: Record<string, unknown>) => unknown
}

function mockBaseRequests(overrides: MockOverrides = {}) {
  const waiters = overrides.waiters ?? [WAITER_RECORD]
  const invitations = overrides.invitations ?? [INVITATION_RECORD]

  vi.mocked(requestSgeb).mockImplementation((config) => {
    const method = config.method ?? 'GET'
    if (config.url === '/usuarios' && method === 'GET') {
      return Promise.resolve(envelopeList(waiters))
    }
    if (config.url === '/roles') {
      return Promise.resolve(envelopeList(ROLE_RECORDS))
    }
    if (config.url === '/usuarios/invitaciones' && method === 'GET') {
      return Promise.resolve(envelopeList(invitations))
    }
    if (config.url === '/usuarios/invitaciones' && method === 'POST') {
      if (overrides.onCreateInvitation) {
        return Promise.resolve(
          envelope(overrides.onCreateInvitation(config.data as Record<string, unknown>)),
        )
      }
      return Promise.resolve(
        envelope({
          correo: (config.data as { correo: string }).correo,
          deeplink: 'mx.mediocres.sgeb://registro?token=fake-token',
          expira_en: '2026-08-08T09:00:00',
        }),
      )
    }
    if (
      config.url ===
        `/usuarios/invitaciones/${String(INVITATION_RECORD.id_invitacion)}` &&
      method === 'DELETE'
    ) {
      return Promise.resolve(envelope({ ...INVITATION_RECORD, estado: 'revocada' }))
    }
    if (
      config.url ===
        `/usuarios/invitaciones/${String(INVITATION_RECORD.id_invitacion)}/reenviar` &&
      method === 'POST'
    ) {
      return Promise.resolve(
        envelope({
          deeplink: 'mx.mediocres.sgeb://registro?token=fake-token-2',
          expira_en: '2026-08-11T09:00:00',
        }),
      )
    }
    return Promise.reject(
      new Error(`Unexpected request: ${method} ${String(config.url)}`),
    )
  })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WaitersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WaitersPage', () => {
  it('renders the real roster (GET /usuarios?rol=mesero) and real invitations (GET /usuarios/invitaciones) — no fixture data, no development banner', async () => {
    mockBaseRequests()

    renderPage()

    expect(await screen.findByText('Juana Pérez López')).toBeInTheDocument()
    expect(await screen.findByText('Pedro Gómez')).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/i)).not.toBeInTheDocument()
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios', params: { rol: 'mesero' } }),
    )
  })

  it('sends activo as a real server query param when the estado filter changes', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Juana Pérez López')
    await user.selectOptions(screen.getByLabelText('Estado de cuenta'), 'inactivo')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/usuarios',
          params: { rol: 'mesero', activo: false },
        }),
      )
    })
  })

  it('sends q as a real server query param (debounced) when the search text changes', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Juana Pérez López')
    await user.type(screen.getByLabelText('Buscar'), 'Juana')

    await waitFor(
      () => {
        expect(requestSgeb).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/usuarios',
            params: { rol: 'mesero', q: 'Juana' },
          }),
        )
      },
      { timeout: 2000 },
    )
  })

  it('shows the empty state when the roster is genuinely empty — not a loading spinner or fixture fallback', async () => {
    mockBaseRequests({ waiters: [] })

    renderPage()

    expect(
      await screen.findByText('No hay meseros que coincidan con los filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('shows a safe error message when the roster request fails, never technical_message', async () => {
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/usuarios') {
        return Promise.reject(
          new SgebApplicationError(500, {
            code: 'SGEB-5008',
            message: 'No pudimos completar la operación.',
            technical_message: 'secreto interno',
          }),
        )
      }
      if (config.url === '/roles') return Promise.resolve(envelopeList(ROLE_RECORDS))
      if (config.url === '/usuarios/invitaciones')
        return Promise.resolve(envelopeList([]))
      return Promise.reject(new Error('unexpected'))
    })

    renderPage()

    expect(
      await screen.findByText('No pudimos completar la operación.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/secreto interno/)).not.toBeInTheDocument()
  })

  it('opens the real invite dialog, validates required fields, and disables submit-triggering while roles are still loading', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    const inviteButton = await screen.findByRole('button', { name: 'Invitar mesero' })
    await waitFor(() => expect(inviteButton).toBeEnabled())
    await user.click(inviteButton)

    expect(screen.getByRole('dialog', { name: 'Invitar mesero' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/invitaciones', method: 'POST' }),
    )
  })

  it('sends the real POST /usuarios/invitaciones request with the resolved mesero role id and no telefono when left blank, then shows the one-time deeplink', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    const inviteButton = await screen.findByRole('button', { name: 'Invitar mesero' })
    await waitFor(() => expect(inviteButton).toBeEnabled())
    await user.click(inviteButton)

    await user.type(screen.getByLabelText(/^Nombre/), 'Pedro')
    await user.type(screen.getByLabelText(/^Apellido paterno/), 'Gómez')
    await user.type(screen.getByLabelText(/^Correo/), 'pedro.gomez@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/usuarios/invitaciones',
          method: 'POST',
          data: {
            idRolDestino: 3,
            nombre: 'Pedro',
            apellidoPaterno: 'Gómez',
            correo: 'pedro.gomez@example.com',
          },
        }),
      )
    })

    expect(await screen.findByText('Invitación enviada')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('mx.mediocres.sgeb://registro?token=fake-token'),
    ).toBeInTheDocument()
  })

  it('renders the optional Teléfono field in the invite dialog', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    const inviteButton = await screen.findByRole('button', { name: 'Invitar mesero' })
    await waitFor(() => expect(inviteButton).toBeEnabled())
    await user.click(inviteButton)

    expect(screen.getByLabelText(/^Teléfono/)).toBeInTheDocument()
  })

  it('sends the exact telefono field when provided, matching the backend TELEFONO format', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    const inviteButton = await screen.findByRole('button', { name: 'Invitar mesero' })
    await waitFor(() => expect(inviteButton).toBeEnabled())
    await user.click(inviteButton)

    await user.type(screen.getByLabelText(/^Nombre/), 'Pedro')
    await user.type(screen.getByLabelText(/^Apellido paterno/), 'Gómez')
    await user.type(screen.getByLabelText(/^Correo/), 'pedro.gomez@example.com')
    await user.type(screen.getByLabelText(/^Teléfono/), '8711234567')
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/usuarios/invitaciones',
          method: 'POST',
          data: {
            idRolDestino: 3,
            nombre: 'Pedro',
            apellidoPaterno: 'Gómez',
            correo: 'pedro.gomez@example.com',
            telefono: '8711234567',
          },
        }),
      )
    })
  })

  it('rejects an invalid telefono client-side and never submits the request', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    const inviteButton = await screen.findByRole('button', { name: 'Invitar mesero' })
    await waitFor(() => expect(inviteButton).toBeEnabled())
    await user.click(inviteButton)

    await user.type(screen.getByLabelText(/^Nombre/), 'Pedro')
    await user.type(screen.getByLabelText(/^Apellido paterno/), 'Gómez')
    await user.type(screen.getByLabelText(/^Correo/), 'pedro.gomez@example.com')
    await user.type(screen.getByLabelText(/^Teléfono/), '123')
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))

    expect(
      await screen.findByText('Ingresa un teléfono válido (10 a 15 dígitos).'),
    ).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/invitaciones', method: 'POST' }),
    )
  })

  it('shows a safe backend error inside the dialog on a failed invitation (e.g. SSO-4001) without closing it', async () => {
    mockBaseRequests()
    vi.mocked(requestSgeb).mockImplementation((config) => {
      const method = config.method ?? 'GET'
      if (config.url === '/usuarios' && method === 'GET')
        return Promise.resolve(envelopeList([WAITER_RECORD]))
      if (config.url === '/roles') return Promise.resolve(envelopeList(ROLE_RECORDS))
      if (config.url === '/usuarios/invitaciones' && method === 'GET')
        return Promise.resolve(envelopeList([]))
      if (config.url === '/usuarios/invitaciones' && method === 'POST') {
        return Promise.reject(
          new SgebApplicationError(409, {
            code: 'SSO-4001',
            message: 'Ya existe una invitación pendiente para ese correo.',
          }),
        )
      }
      return Promise.reject(new Error('unexpected'))
    })
    const user = userEvent.setup()
    renderPage()

    const inviteButton = await screen.findByRole('button', { name: 'Invitar mesero' })
    await waitFor(() => expect(inviteButton).toBeEnabled())
    await user.click(inviteButton)
    await user.type(screen.getByLabelText(/^Nombre/), 'Pedro')
    await user.type(screen.getByLabelText(/^Apellido paterno/), 'Gómez')
    await user.type(screen.getByLabelText(/^Correo/), 'pedro.gomez@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))

    expect(
      await screen.findByText('Ya existe una invitación pendiente para ese correo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Invitar mesero' })).toBeInTheDocument()
  })

  it('revokes a pending invitation via the real DELETE endpoint', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Pedro Gómez')
    await user.click(screen.getByRole('button', { name: 'Revocar' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/usuarios/invitaciones/${String(INVITATION_RECORD.id_invitacion)}`,
          method: 'DELETE',
        }),
      )
    })
  })

  it('resends a pending invitation via the real POST .../reenviar endpoint and shows the new one-time deeplink', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Pedro Gómez')
    await user.click(screen.getByRole('button', { name: 'Reenviar' }))

    expect(await screen.findByText('Invitación enviada')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('mx.mediocres.sgeb://registro?token=fake-token-2'),
    ).toBeInTheDocument()
  })

  it('shows the forbidden state, and never fetches GET /usuarios or GET /usuarios/invitaciones, for a mesero session — this web console is not the mesero product (native iOS app)', async () => {
    authenticate('mesero')
    mockBaseRequests()
    renderPage()

    expect(
      await screen.findByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Juana Pérez López')).not.toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios' }),
    )
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/invitaciones' }),
    )
  })

  it('renders the real roster for an admin session too — Meseros is not admin-exclusive like Usuarios/Bitácora', async () => {
    authenticate('admin')
    mockBaseRequests()
    renderPage()

    expect(await screen.findByText('Juana Pérez López')).toBeInTheDocument()
  })
})
