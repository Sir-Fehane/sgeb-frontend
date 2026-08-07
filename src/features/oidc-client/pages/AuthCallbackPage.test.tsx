import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type * as ReactRouterDom from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthCallbackPage } from '@/features/oidc-client/pages/AuthCallbackPage'
import * as callbackModule from '@/features/oidc-client/protocol/callback'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <AuthCallbackPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useOidcSessionStore.getState().reset()
  vi.restoreAllMocks()
})

describe('AuthCallbackPage', () => {
  it('renders the processing state first', () => {
    vi.spyOn(callbackModule, 'processAuthorizationCallback').mockReturnValue(
      new Promise(() => undefined),
    )

    renderAt('?code=abc&state=xyz')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Verificando tu inicio de sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a safe error and offers a restart action on an invalid callback', async () => {
    vi.spyOn(callbackModule, 'processAuthorizationCallback').mockResolvedValue({
      kind: 'error',
      message: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
      canRestart: true,
    })

    renderAt('')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'No pudimos completar el inicio de sesión' }),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
    )
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeInTheDocument()
  })

  it('never renders raw OAuth parameters, tokens, code, state, nonce, or verifier', async () => {
    vi.spyOn(callbackModule, 'processAuthorizationCallback').mockResolvedValue({
      kind: 'error',
      message: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
      canRestart: true,
    })

    renderAt('?code=super-secret-code&state=secret-state&error_description=leaked-detail')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toContain('super-secret-code')
    expect(rendered).not.toContain('secret-state')
    expect(rendered).not.toContain('leaked-detail')
  })

  it('populates the authenticated session and navigates to returnTo on success', async () => {
    vi.spyOn(callbackModule, 'processAuthorizationCallback').mockResolvedValue({
      kind: 'success',
      returnTo: '/reportes',
      session: {
        accessToken: 'the-access-token',
        accessTokenExpiresAt: Date.now() + 900_000,
        user: { sub: 'uuid-1', rol: 'capitan' },
      },
    })

    renderAt('?code=abc&state=xyz')

    await waitFor(() => {
      expect(useOidcSessionStore.getState().session.status).toBe('authenticated')
    })

    const session = useOidcSessionStore.getState().session
    if (session.status === 'authenticated') {
      expect(session.user.sub).toBe('uuid-1')
    }
  })
})
