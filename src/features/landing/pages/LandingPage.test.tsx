import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { LandingPage } from '@/features/landing/pages/LandingPage'

vi.mock('@/features/oidc-client/protocol/authorizationRequest', () => ({
  beginAuthorization: vi.fn(),
}))

const mockedBeginAuthorization = vi.mocked(beginAuthorization)

beforeEach(() => {
  mockedBeginAuthorization.mockReset()
  useOidcSessionStore.getState().reset()
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/panel" element={<p>Panel destino</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('renders SGEB branding and an "Iniciar sesión" action for an idle/anonymous session', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'SGEB' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'SGEB' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('starts the real SSO authorization flow, unmodified, when "Iniciar sesión" is activated', async () => {
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    expect(mockedBeginAuthorization).toHaveBeenCalledWith()
  })

  it('redirects an already-authenticated session straight to /panel instead of showing the login prompt', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'test-access-token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', rol: 'capitan' },
    })

    renderPage()

    expect(screen.getByText('Panel destino')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
    expect(mockedBeginAuthorization).not.toHaveBeenCalled()
  })
})
