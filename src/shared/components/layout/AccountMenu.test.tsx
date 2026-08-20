import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    render(<AccountMenu />)

    const button = screen.getByRole('button', { name: 'Cuenta' })
    expect(button).toBeDisabled()
  })

  it('shows the real session identity (name, email, role) from /userinfo — no placeholder/pending copy', async () => {
    authenticate()
    const user = userEvent.setup()
    render(<AccountMenu />)

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))

    expect(screen.getByText('Juana Pérez')).toBeInTheDocument()
    expect(screen.getByText('juana.perez@example.com')).toBeInTheDocument()
    expect(screen.getByText('Capitán')).toBeInTheDocument()
    expect(screen.queryByText(/pendiente/i)).not.toBeInTheDocument()
  })

  it('calls the real, previously-unwired logout() with the session id token when "Cerrar sesión" is activated', async () => {
    authenticate()
    const user = userEvent.setup()
    render(<AccountMenu />)

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(logout).toHaveBeenCalledWith({ idTokenHint: 'test-id-token' })
  })

  it('closes the dropdown on Escape', async () => {
    authenticate()
    const user = userEvent.setup()
    render(<AccountMenu />)

    await user.click(screen.getByRole('button', { name: 'Cuenta de Juana Pérez' }))
    expect(screen.getByRole('dialog', { name: 'Cuenta' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
