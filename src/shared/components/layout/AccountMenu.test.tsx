import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { logout } from '@/features/oidc-client/client/logoutUrl'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { AccountMenu } from '@/shared/components/layout/AccountMenu'

vi.mock('@/features/oidc-client/client/logoutUrl', () => ({
  logout: vi.fn(),
}))

beforeEach(() => {
  useOidcSessionStore.getState().reset()
  vi.mocked(logout).mockReset()
})

/** `AccountMenu` renders a real `Link` to `/perfil` (feature/app-shell-hardening) — a `Router` context is required now. */
function renderMenu() {
  return render(
    <MemoryRouter>
      <AccountMenu />
    </MemoryRouter>,
  )
}

function authenticate() {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    idToken: 'test-id-token',
    user: {
      sub: 'uuid-test-user',
      name: 'Juana Pérez',
      given_name: 'Juana',
      family_name: 'Pérez',
      email: 'juana.perez@example.com',
      email_verified: true,
      rol: 'capitan',
    },
  })
}

describe('AccountMenu', () => {
  it('renders a safe disabled fallback when there is no authenticated session — never a crash', () => {
    renderMenu()

    const button = screen.getByRole('button', { name: 'Cuenta' })
    expect(button).toBeDisabled()
  })

  it('shows the real session identity (name, email, role) from /userinfo — no placeholder/pending copy', async () => {
    authenticate()
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))

    expect(screen.getByText('Juana Pérez')).toBeInTheDocument()
    expect(screen.getByText('juana.perez@example.com')).toBeInTheDocument()
    expect(screen.getByText('Capitán')).toBeInTheDocument()
    expect(screen.queryByText(/pendiente/i)).not.toBeInTheDocument()
  })

  it('calls the real, previously-unwired logout() with the session id token when "Cerrar sesión" is activated', async () => {
    authenticate()
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(logout).toHaveBeenCalledWith({ idTokenHint: 'test-id-token' })
  })

  it('links "Mi perfil" to /perfil and renders no password/2FA/security control (feature/app-shell-hardening)', async () => {
    authenticate()
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))

    const profileLink = screen.getByRole('link', { name: 'Mi perfil' })
    expect(profileLink).toHaveAttribute('href', '/perfil')
    expect(
      screen.queryByRole('button', { name: /contraseña|2fa|seguridad/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /contraseña|2fa|seguridad/i }),
    ).not.toBeInTheDocument()
  })

  it('closes the dropdown when "Mi perfil" is activated', async () => {
    authenticate()
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))
    await user.click(screen.getByRole('link', { name: 'Mi perfil' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the dropdown on Escape', async () => {
    authenticate()
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))
    expect(screen.getByRole('dialog', { name: 'Cuenta' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
