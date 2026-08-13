import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShellLayout } from '@/app/router/layouts/AppShellLayout'
import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import * as bootstrapModule from '@/features/oidc-client/protocol/bootstrap'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'

/**
 * Hoisted, whole-module mock — deliberately not a per-test `vi.spyOn` — so
 * the REAL `beginAuthorization` (and therefore the real `getOidcConfig()`,
 * which requires `VITE_OIDC_*` env vars this test environment intentionally
 * never provides — see `.env.test`'s own comment on why OIDC config is not
 * duplicated there) can never execute, regardless of when or how
 * `AppShellLayout` resolves its own import of this module. `vi.mock` is
 * hoisted above every import in this file and intercepts module resolution
 * itself, unlike `vi.spyOn`, which only overwrites an already-resolved
 * module's export from the moment it runs onward.
 */
vi.mock('@/features/oidc-client/protocol/authorizationRequest', () => ({
  beginAuthorization: vi.fn(),
}))

const mockedBeginAuthorization = vi.mocked(beginAuthorization)

const FIXTURE_USER = { sub: 'uuid-test-user', rol: 'capitan' as const }

function authenticate() {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: FIXTURE_USER,
  })
}

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppShellLayout />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useOidcSessionStore.getState().reset()
  vi.restoreAllMocks()
  mockedBeginAuthorization.mockReset()
  // Every test that doesn't care about the guard itself renders an already
  // authenticated session, matching this file's pre-existing behavior
  // (asserting on AppShell/Topbar content) without touching every call site.
  authenticate()
})

/**
 * Regression coverage for the Topbar title-matching logic's segment
 * safety (widened in feature/event-detail-ui-foundation to cover nested
 * routes like `/eventos/:id`). `startsWith(`${item.href}/`)` — with the
 * trailing slash — is what prevents a path that merely shares a text
 * prefix (`/eventos-extra`, `/eventos123`) from being mistaken for a
 * genuine nested segment of `/eventos`.
 */
describe('AppShellLayout — Topbar title matching is segment-safe', () => {
  it('matches the exact nav href', () => {
    renderAt('/eventos')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('matches a genuine nested route segment', () => {
    renderAt('/eventos/123')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('does not match a path that merely shares a text prefix, with no segment boundary', () => {
    renderAt('/eventos-extra')

    expect(screen.getByRole('heading', { level: 1, name: 'SGEB' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Eventos' }),
    ).not.toBeInTheDocument()
  })

  it('does not match a path with no separator at all', () => {
    renderAt('/eventos123')

    expect(screen.getByRole('heading', { level: 1, name: 'SGEB' })).toBeInTheDocument()
  })

  it('applies the same segment-safe rule to every nav item, not only /eventos', () => {
    renderAt('/panel-extra')

    expect(screen.getByRole('heading', { level: 1, name: 'SGEB' })).toBeInTheDocument()
  })
})

describe('AppShellLayout — private authentication route boundary', () => {
  it('does not render AppShell/Outlet chrome while the session is idle', () => {
    useOidcSessionStore.getState().reset()
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockReturnValue(
      new Promise(() => undefined),
    )

    renderAt('/panel')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('does not render AppShell/Outlet chrome while the session is authenticating', async () => {
    useOidcSessionStore.getState().reset()
    let resolveBootstrap!: (value: bootstrapModule.BootstrapOutcome) => void
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockReturnValue(
      new Promise((resolve) => {
        resolveBootstrap = resolve
      }),
    )

    renderAt('/panel')

    await waitFor(() => {
      expect(useOidcSessionStore.getState().session.status).toBe('authenticating')
    })
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()

    // Resolve so the test doesn't leave a dangling unresolved promise.
    resolveBootstrap({ kind: 'anonymous' })
  })

  it('renders the real AppShell/Outlet chrome once the session is authenticated', () => {
    renderAt('/panel')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('on an anonymous session, calls beginAuthorization exactly once and never renders AppShell chrome', async () => {
    useOidcSessionStore.getState().setAnonymous()
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    renderAt('/eventos/1001')

    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })
    expect(mockedBeginAuthorization).toHaveBeenCalledWith({ returnTo: '/eventos/1001' })
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })

  it('on an error session, also calls beginAuthorization exactly once (treated as not-authenticated)', async () => {
    useOidcSessionStore.getState().setError('No pudimos completar el inicio de sesión.')
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    renderAt('/panel')

    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })
  })

  it('does not call beginAuthorization again merely because the route changes while still anonymous', async () => {
    useOidcSessionStore.getState().setAnonymous()
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    const { rerender } = render(
      <MemoryRouter initialEntries={['/panel']}>
        <AppShellLayout />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })

    rerender(
      <MemoryRouter initialEntries={['/eventos']}>
        <AppShellLayout />
      </MemoryRouter>,
    )

    expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
  })

  it('does not call beginAuthorization twice under a StrictMode-style double render', async () => {
    useOidcSessionStore.getState().setAnonymous()
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    const { rerender } = renderAt('/panel')
    rerender(
      <MemoryRouter initialEntries={['/panel']}>
        <AppShellLayout />
      </MemoryRouter>,
    )
    rerender(
      <MemoryRouter initialEntries={['/panel']}>
        <AppShellLayout />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })
  })

  it('does not call beginAuthorization while authenticated (no route-change re-authorization)', () => {
    renderAt('/panel')

    expect(mockedBeginAuthorization).not.toHaveBeenCalled()
  })

  it('stops rendering AppShell/Outlet content once an authenticated session resets to anonymous', async () => {
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    renderAt('/panel')
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()

    act(() => {
      useOidcSessionStore.getState().setAnonymous()
    })

    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })
  })
})
