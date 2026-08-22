import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { UsersPage } from '@/features/users/pages/UsersPage'
import type { UsuarioApiRecord } from '@/features/users/services/usersApi'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

const CURRENT_USER_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const USER_RECORD: UsuarioApiRecord = {
  uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombre: 'María',
  apellido_paterno: 'López',
  apellido_materno: 'García',
  correo: 'maria.lopez@example.com',
  telefono: '+528711234567',
  activo: true,
  creado_en: '2026-01-05T10:00:00',
  rol: { id_rol: 2, nombre: 'capitan', descripcion: null, activo: true },
}

const ROLE_RECORDS = [
  { id_rol: 1, nombre: 'admin', descripcion: null, activo: true },
  { id_rol: 2, nombre: 'capitan', descripcion: null, activo: true },
  { id_rol: 3, nombre: 'mesero', descripcion: null, activo: true },
]

function envelopeList(data: unknown[]) {
  return {
    result: { code: data.length ? 'SGEB-0000' : 'SGEB-0002', message: 'ok' },
    data,
  }
}
function envelope(data: unknown) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

function authenticate() {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: {
      sub: CURRENT_USER_UUID,
      name: 'Admin Test',
      email: 'admin@example.com',
      rol: 'admin',
    },
  })
}

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
})

interface MockOverrides {
  users?: UsuarioApiRecord[]
  onUpdate?: (uuid: string, body: Record<string, unknown>) => unknown
  onSetActive?: (uuid: string, body: Record<string, unknown>) => unknown
}

function mockBaseRequests(overrides: MockOverrides = {}) {
  const users = overrides.users ?? [USER_RECORD]

  vi.mocked(requestSgeb).mockImplementation((config) => {
    const method = config.method ?? 'GET'
    if (config.url === '/usuarios' && method === 'GET') {
      return Promise.resolve(envelopeList(users))
    }
    if (config.url === '/roles') {
      return Promise.resolve(envelopeList(ROLE_RECORDS))
    }
    if (
      typeof config.url === 'string' &&
      config.url.startsWith('/usuarios/') &&
      method === 'GET'
    ) {
      const uuid = config.url.split('/').pop()
      const found = users.find((u) => u.uuid_usuario === uuid)
      return found
        ? Promise.resolve(envelope(found))
        : Promise.reject(new Error(`No user ${String(uuid)}`))
    }
    if (
      typeof config.url === 'string' &&
      config.url.startsWith('/usuarios/') &&
      method === 'PUT'
    ) {
      const uuid = config.url.split('/').pop()!
      const body = config.data as Record<string, unknown>
      const result = overrides.onUpdate
        ? overrides.onUpdate(uuid, body)
        : { ...USER_RECORD, ...body }
      return Promise.resolve(envelope(result))
    }
    if (
      typeof config.url === 'string' &&
      config.url.startsWith('/usuarios/') &&
      method === 'PATCH'
    ) {
      const uuid = config.url.split('/').pop()!
      const body = config.data as Record<string, unknown>
      if (overrides.onSetActive) {
        return Promise.resolve(envelope(overrides.onSetActive(uuid, body)))
      }
      return Promise.resolve(envelope({ ...USER_RECORD, ...body }))
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
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UsersPage', () => {
  it('renders the real directory (GET /usuarios, no rol filter) and each row shows role + status', async () => {
    mockBaseRequests()

    renderPage()

    expect(await screen.findByText('María López García')).toBeInTheDocument()
    const row = screen.getByRole('listitem')
    expect(within(row).getByText('Capitán')).toBeInTheDocument()
    expect(within(row).getByText('Activo')).toBeInTheDocument()
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios', params: {} }),
    )
  })

  it('sends rol/activo/q as real server query params when filters change', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('María López García')
    await user.selectOptions(screen.getByLabelText('Rol'), 'capitan')

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/usuarios', params: { rol: 'capitan' } }),
      )
    })
  })

  it('shows the empty state when the directory is genuinely empty', async () => {
    mockBaseRequests({ users: [] })

    renderPage()

    expect(
      await screen.findByText('No hay usuarios que coincidan con los filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('shows a safe error message on a failed list load, never technical_message', async () => {
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
      return Promise.reject(new Error('unexpected'))
    })

    renderPage()

    expect(
      await screen.findByText('No pudimos completar la operación.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/secreto interno/)).not.toBeInTheDocument()
  })

  it('opens the detail dialog, edits the safe fields, and saves via the real PUT endpoint', async () => {
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('María López García'))
    expect(screen.getByRole('dialog', { name: 'Detalle de usuario' })).toBeInTheDocument()

    const telefonoInput = await screen.findByLabelText('Teléfono')
    await user.clear(telefonoInput)
    await user.type(telefonoInput, '+528711112222')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/usuarios/${USER_RECORD.uuid_usuario}`,
          method: 'PUT',
          data: {
            nombre: 'María',
            apellidoPaterno: 'López',
            apellidoMaterno: 'García',
            telefono: '+528711112222',
          },
        }),
      )
    })
    expect(
      await screen.findByText('Los datos se guardaron correctamente.'),
    ).toBeInTheDocument()
  })

  it('disables the status action and explains why when the row is the caller’s own account', async () => {
    authenticate()
    mockBaseRequests({ users: [{ ...USER_RECORD, uuid_usuario: CURRENT_USER_UUID }] })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('María López García'))

    expect(
      await screen.findByText(
        'No puedes cambiar el estado de tu propia cuenta desde aquí.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Desactivar cuenta' }),
    ).not.toBeInTheDocument()
  })

  it('deactivates another user via the real PATCH endpoint after confirming', async () => {
    authenticate()
    mockBaseRequests()
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('María López García'))
    await user.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar desactivación' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/usuarios/${USER_RECORD.uuid_usuario}`,
          method: 'PATCH',
          data: { activo: false },
        }),
      )
    })
  })

  it('links "Invitar mesero" to the existing /meseros invitation flow rather than a duplicated create form', async () => {
    mockBaseRequests()
    renderPage()

    await screen.findByText('María López García')
    const link = screen.getByRole('link', { name: /Invitar mesero/ })
    expect(link).toHaveAttribute('href', '/meseros')
  })
})
