import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as OidcConfigModule from '@/features/oidc-client/config/oidcConfig'
import {
  beginAuthorization,
  buildAuthorizeUrl,
} from '@/features/oidc-client/protocol/authorizationRequest'
import { consumeAuthorizationTransaction } from '@/features/oidc-client/storage/authorizationTransaction'

const VALID_ENV = {
  VITE_OIDC_ISSUER: 'https://auth.sgeb.mediocres.mx',
  VITE_OIDC_CLIENT_ID: 'sgeb-web-panel',
  VITE_OIDC_REDIRECT_URI: 'http://localhost:5173/auth/callback',
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: 'http://localhost:5173/',
  VITE_OIDC_SCOPE: 'openid perfil sgeb.api',
}

vi.mock('@/features/oidc-client/config/oidcConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof OidcConfigModule>()
  return {
    ...actual,
    getOidcConfig: () => ({
      issuer: VALID_ENV.VITE_OIDC_ISSUER,
      clientId: VALID_ENV.VITE_OIDC_CLIENT_ID,
      redirectUri: VALID_ENV.VITE_OIDC_REDIRECT_URI,
      postLogoutRedirectUri: VALID_ENV.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
      scope: VALID_ENV.VITE_OIDC_SCOPE,
    }),
  }
})

beforeEach(() => {
  sessionStorage.clear()
})

describe('buildAuthorizeUrl', () => {
  const config = {
    issuer: 'https://auth.sgeb.mediocres.mx',
    clientId: 'sgeb-web-panel',
    redirectUri: 'http://localhost:5173/auth/callback',
    postLogoutRedirectUri: 'http://localhost:5173/',
    scope: 'openid perfil sgeb.api',
  }

  it('includes exactly the required parameters', () => {
    const url = new URL(
      buildAuthorizeUrl(config, {
        state: 'state-value',
        nonce: 'nonce-value',
        codeChallenge: 'challenge-value',
      }),
    )

    expect(url.origin + url.pathname).toBe('https://auth.sgeb.mediocres.mx/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('sgeb-web-panel')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/auth/callback',
    )
    expect(url.searchParams.get('scope')).toBe('openid perfil sgeb.api')
    expect(url.searchParams.get('state')).toBe('state-value')
    expect(url.searchParams.get('nonce')).toBe('nonce-value')
    expect(url.searchParams.get('code_challenge')).toBe('challenge-value')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('never includes a client secret parameter', () => {
    const url = new URL(
      buildAuthorizeUrl(config, {
        state: 'state-value',
        nonce: 'nonce-value',
        codeChallenge: 'challenge-value',
      }),
    )

    expect(url.searchParams.has('client_secret')).toBe(false)
  })

  it('includes prompt=none only when explicitly requested', () => {
    const withoutPrompt = new URL(
      buildAuthorizeUrl(config, {
        state: 's',
        nonce: 'n',
        codeChallenge: 'c',
      }),
    )
    const withPrompt = new URL(
      buildAuthorizeUrl(config, {
        state: 's',
        nonce: 'n',
        codeChallenge: 'c',
        prompt: 'none',
      }),
    )

    expect(withoutPrompt.searchParams.has('prompt')).toBe(false)
    expect(withPrompt.searchParams.get('prompt')).toBe('none')
  })

  it('includes login_hint only when supplied', () => {
    const url = new URL(
      buildAuthorizeUrl(config, {
        state: 's',
        nonce: 'n',
        codeChallenge: 'c',
        loginHint: 'capitan@mediocres.mx',
      }),
    )

    expect(url.searchParams.get('login_hint')).toBe('capitan@mediocres.mx')
  })
})

describe('beginAuthorization', () => {
  it('stores the transaction before invoking navigate', async () => {
    const navigate = vi.fn(() => {
      // At the moment navigate is called, the transaction must already be
      // readable — but reading it here would consume it, so instead this
      // spy only proves ordering by asserting sessionStorage already has
      // an entry via the raw API (non-consuming).
      expect(sessionStorage.getItem('sgeb.oidc.authorization-transaction')).not.toBeNull()
    })

    await beginAuthorization({}, navigate)

    expect(navigate).toHaveBeenCalledOnce()
  })

  it('passes the navigate callback the exact constructed URL', async () => {
    const navigate = vi.fn()

    const url = await beginAuthorization({}, navigate)

    expect(navigate).toHaveBeenCalledWith(url)
    expect(url.startsWith('https://auth.sgeb.mediocres.mx/authorize?')).toBe(true)
  })

  it('defaults returnTo to /panel when not supplied', async () => {
    const navigate = vi.fn()
    await beginAuthorization({}, navigate)

    const transaction = consumeAuthorizationTransaction()
    expect(transaction?.returnTo).toBe('/panel')
  })

  it('falls back to /panel when an unsafe returnTo is supplied', async () => {
    const navigate = vi.fn()
    await beginAuthorization({ returnTo: 'https://evil.example' }, navigate)

    const transaction = consumeAuthorizationTransaction()
    expect(transaction?.returnTo).toBe('/panel')
  })

  it('preserves a safe, explicit returnTo', async () => {
    const navigate = vi.fn()
    await beginAuthorization({ returnTo: '/reportes' }, navigate)

    const transaction = consumeAuthorizationTransaction()
    expect(transaction?.returnTo).toBe('/reportes')
  })

  it('never performs a network request merely by being called', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const navigate = vi.fn()

    await beginAuthorization({}, navigate)

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
