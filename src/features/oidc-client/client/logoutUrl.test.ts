import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildLogoutUrl, logout } from '@/features/oidc-client/client/logoutUrl'
import type * as OidcConfigModule from '@/features/oidc-client/config/oidcConfig'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'

vi.mock('@/features/oidc-client/config/oidcConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof OidcConfigModule>()
  return {
    ...actual,
    getOidcConfig: () => ({
      issuer: 'https://auth.sgeb.mediocres.mx',
      clientId: 'sgeb-web-panel',
      redirectUri: 'http://localhost:5173/auth/callback',
      postLogoutRedirectUri: 'http://localhost:5173/',
      scope: 'openid perfil sgeb.api',
    }),
  }
})

const config = {
  issuer: 'https://auth.sgeb.mediocres.mx',
  clientId: 'sgeb-web-panel',
  redirectUri: 'http://localhost:5173/auth/callback',
  postLogoutRedirectUri: 'http://localhost:5173/',
  scope: 'openid perfil sgeb.api',
}

beforeEach(() => {
  useOidcSessionStore.getState().reset()
})

describe('buildLogoutUrl', () => {
  it('builds the full-page provider logout URL with the registered post-logout redirect', () => {
    const url = new URL(buildLogoutUrl(config))

    expect(url.origin + url.pathname).toBe('https://auth.sgeb.mediocres.mx/logout')
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'http://localhost:5173/',
    )
  })

  it('includes id_token_hint only when supplied', () => {
    const without = new URL(buildLogoutUrl(config))
    const withHint = new URL(buildLogoutUrl(config, { idTokenHint: 'the-id-token' }))

    expect(without.searchParams.has('id_token_hint')).toBe(false)
    expect(withHint.searchParams.get('id_token_hint')).toBe('the-id-token')
  })

  it('includes state only when supplied', () => {
    const url = new URL(buildLogoutUrl(config, { state: 'xyz' }))

    expect(url.searchParams.get('state')).toBe('xyz')
  })
})

describe('logout', () => {
  it('navigates rather than fetching', () => {
    const navigate = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    logout({}, navigate)

    expect(navigate).toHaveBeenCalledOnce()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('clears the in-memory session before navigating', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'uuid-1' },
    })

    logout({}, vi.fn())

    expect(useOidcSessionStore.getState().session).toEqual({ status: 'idle' })
  })

  it('passes navigate the exact constructed URL', () => {
    const navigate = vi.fn()

    const url = logout({ idTokenHint: 'the-id-token' }, navigate)

    expect(navigate).toHaveBeenCalledWith(url)
    expect(url).toContain('id_token_hint=the-id-token')
  })
})
