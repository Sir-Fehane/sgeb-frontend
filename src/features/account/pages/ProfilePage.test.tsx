import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfilePage } from '@/features/account/pages/ProfilePage'
import type { UsuarioApiRecord } from '@/features/account/services/usuariosApi'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import type { OidcRole } from '@/features/oidc-client/types/userInfo'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

const RECORD: UsuarioApiRecord = {
  uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombre: 'Ana',
  apellido_paterno: 'Torres',
  apellido_materno: null,
  correo: 'ana.torres@example.com',
  telefono: null,
  activo: true,
}

function envelope(data: UsuarioApiRecord) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

function authenticateAs(rol: OidcRole) {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: { sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', rol },
  })
}

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
  authenticateAs('capitan')
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  )
}

describe('ProfilePage', () => {
  it('shows a loading state while GET /usuarios/me is pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderPage()

    expect(screen.getByRole('status', { name: 'Cargando tu perfil' })).toBeInTheDocument()
  })

  it('loads the real profile: editable fields pre-filled, correo/rol read-only', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    renderPage()

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Torres')).toBeInTheDocument()
    expect(screen.getByText('ana.torres@example.com')).toBeInTheDocument()
    expect(screen.getByText('Capitán')).toBeInTheDocument()
    // correo/rol are read-only context, never editable inputs.
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Rol')).not.toBeInTheDocument()
  })

  it('never renders a password/2FA/account-security control — SSO-owned, not SGEB', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    renderPage()

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /contraseña|2fa|seguridad/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the safe error message and a retry action on load failure, never technical_message', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(500, {
        code: 'SGEB-5008',
        message: 'No pudimos completar la operación.',
        technical_message: 'stack trace secreto interno',
      }),
    )
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByText('No pudimos completar la operación.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/stack trace secreto interno/)).not.toBeInTheDocument()

    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
  })

  it('rejects an empty required field client-side and never calls PUT', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))
    const user = userEvent.setup()
    renderPage()

    const nombreInput = await screen.findByDisplayValue('Ana')
    await user.clear(nombreInput)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Usa entre 2 y 30 letras.')).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('saves an edited field via PUT /usuarios/me with the exact translated payload, then shows success feedback', async () => {
    vi.mocked(requestSgeb).mockResolvedValueOnce(envelope(RECORD))
    const user = userEvent.setup()
    renderPage()

    const telefonoInput = await screen.findByLabelText('Teléfono')
    await user.type(telefonoInput, '+528112345678')

    vi.mocked(requestSgeb).mockResolvedValueOnce(
      envelope({ ...RECORD, telefono: '+528112345678' }),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Perfil actualizado')).toBeInTheDocument()
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/me',
      method: 'PUT',
      data: {
        nombre: 'Ana',
        apellidoPaterno: 'Torres',
        apellidoMaterno: null,
        telefono: '+528112345678',
      },
    })
  })

  it('shows the safe error message on a failed save, never technical_message', async () => {
    vi.mocked(requestSgeb).mockResolvedValueOnce(envelope(RECORD))
    const user = userEvent.setup()
    renderPage()

    await screen.findByDisplayValue('Ana')
    vi.mocked(requestSgeb).mockRejectedValueOnce(
      new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.'),
    ).toBeInTheDocument()
  })
})

describe('ProfilePage — bank data visibility', () => {
  it('shows the Datos bancarios section for a mesero session', async () => {
    authenticateAs('mesero')
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/usuarios/me') {
        return Promise.resolve(envelope(RECORD))
      }
      if (config.url === '/usuarios/me/datos-bancarios') {
        return Promise.reject(
          new SgebApplicationError(404, {
            code: 'SGEB-3001',
            message: 'No encontramos la información solicitada.',
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
    })

    renderPage()

    expect(await screen.findByText('Datos bancarios')).toBeInTheDocument()
    expect(
      await screen.findByText('Aún no registras tus datos bancarios.'),
    ).toBeInTheDocument()
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/me/datos-bancarios' }),
    )
  })

  it('never shows the Datos bancarios section, and never fetches it, for a capitán session', async () => {
    authenticateAs('capitan')
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    renderPage()

    await screen.findByDisplayValue('Ana')
    expect(screen.queryByText('Datos bancarios')).not.toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/me/datos-bancarios' }),
    )
  })

  it('never shows the Datos bancarios section, and never fetches it, for an admin session', async () => {
    authenticateAs('admin')
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    renderPage()

    await screen.findByDisplayValue('Ana')
    expect(screen.queryByText('Datos bancarios')).not.toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/me/datos-bancarios' }),
    )
  })
})
