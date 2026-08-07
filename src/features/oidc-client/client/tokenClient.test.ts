import { describe, expect, it, vi } from 'vitest'

import {
  exchangeAuthorizationCode,
  refreshAccessToken,
  type TokenHttpResponse,
  type TokenTransport,
} from '@/features/oidc-client/client/tokenClient'
import type * as OidcConfigModule from '@/features/oidc-client/config/oidcConfig'

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

const SUCCESS_TOKEN = {
  access_token: 'eyJ.header.payload',
  token_type: 'Bearer' as const,
  expires_in: 900,
}

describe('exchangeAuthorizationCode', () => {
  it('sends a form-urlencoded body with exactly the required fields', async () => {
    const transport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 200, body: SUCCESS_TOKEN } satisfies TokenHttpResponse)

    await exchangeAuthorizationCode(
      {
        code: 'auth-code-123',
        redirectUri: 'http://localhost:5173/auth/callback',
        codeVerifier: 'verifier-abc',
      },
      transport,
    )

    expect(transport).toHaveBeenCalledOnce()
    const [endpoint, body] = transport.mock.calls[0]!
    expect(endpoint).toBe('https://auth.sgeb.mediocres.mx/token')
    expect(body).toBeInstanceOf(URLSearchParams)
    expect(Object.fromEntries(body.entries())).toEqual({
      grant_type: 'authorization_code',
      client_id: 'sgeb-web-panel',
      code: 'auth-code-123',
      redirect_uri: 'http://localhost:5173/auth/callback',
      code_verifier: 'verifier-abc',
    })
  })

  it('never includes a client secret', async () => {
    const transport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 200, body: SUCCESS_TOKEN })

    await exchangeAuthorizationCode(
      { code: 'c', redirectUri: 'r', codeVerifier: 'v' },
      transport,
    )

    const [, body] = transport.mock.calls[0]!
    expect(body.has('client_secret')).toBe(false)
  })

  it('parses a successful RespuestaToken', async () => {
    const transport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 200, body: SUCCESS_TOKEN })

    const result = await exchangeAuthorizationCode(
      { code: 'c', redirectUri: 'r', codeVerifier: 'v' },
      transport,
    )

    expect(result).toEqual({ outcome: 'success', token: SUCCESS_TOKEN })
  })

  it('parses an ErrorOAuth body on a 400 response', async () => {
    const oauthError = {
      error: 'invalid_grant',
      error_description: 'El código de autorización no es válido o ya fue utilizado.',
      sso_code: 'SSO-1015',
    }
    const transport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 400, body: oauthError })

    const result = await exchangeAuthorizationCode(
      { code: 'c', redirectUri: 'r', codeVerifier: 'v' },
      transport,
    )

    expect(result).toEqual({ outcome: 'oauth-error', error: oauthError })
  })

  it('distinguishes a network failure from an OAuth failure', async () => {
    const transport = vi
      .fn<TokenTransport>()
      .mockRejectedValue(new Error('Network Error'))

    const result = await exchangeAuthorizationCode(
      { code: 'c', redirectUri: 'r', codeVerifier: 'v' },
      transport,
    )

    expect(result.outcome).toBe('network-error')
  })

  it('makes exactly one attempt — no automatic retry', async () => {
    const transport = vi
      .fn<TokenTransport>()
      .mockRejectedValue(new Error('Network Error'))

    await exchangeAuthorizationCode(
      { code: 'c', redirectUri: 'r', codeVerifier: 'v' },
      transport,
    )

    expect(transport).toHaveBeenCalledOnce()
  })

  it('never performs a real network request in the test suite', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const transport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 200, body: SUCCESS_TOKEN })

    await exchangeAuthorizationCode(
      { code: 'c', redirectUri: 'r', codeVerifier: 'v' },
      transport,
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('refreshAccessToken', () => {
  it('sends exactly grant_type and client_id — never a refresh_token field', async () => {
    const transport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 200, body: SUCCESS_TOKEN })

    await refreshAccessToken(transport)

    const [endpoint, body] = transport.mock.calls[0]!
    expect(endpoint).toBe('https://auth.sgeb.mediocres.mx/token')
    expect(Object.fromEntries(body.entries())).toEqual({
      grant_type: 'refresh_token',
      client_id: 'sgeb-web-panel',
    })
    expect(body.has('refresh_token')).toBe(false)
  })

  it('shares one in-flight promise across concurrent same-tab calls', async () => {
    let resolveTransport!: (value: TokenHttpResponse) => void
    const transport = vi.fn<TokenTransport>().mockReturnValue(
      new Promise<TokenHttpResponse>((resolve) => {
        resolveTransport = resolve
      }),
    )

    const first = refreshAccessToken(transport)
    const second = refreshAccessToken(transport)

    expect(transport).toHaveBeenCalledOnce()

    resolveTransport({ status: 200, body: SUCCESS_TOKEN })
    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(firstResult).toEqual(secondResult)
  })

  it('releases the lock after a failure, so the next call tries again', async () => {
    const failingTransport = vi
      .fn<TokenTransport>()
      .mockRejectedValue(new Error('Network Error'))

    const firstResult = await refreshAccessToken(failingTransport)
    expect(firstResult.outcome).toBe('network-error')

    const successTransport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 200, body: SUCCESS_TOKEN })

    const secondResult = await refreshAccessToken(successTransport)

    expect(successTransport).toHaveBeenCalledOnce()
    expect(secondResult).toEqual({ outcome: 'success', token: SUCCESS_TOKEN })
  })

  it('releases the lock after success, so a later call starts a fresh request', async () => {
    const transport = vi
      .fn<TokenTransport>()
      .mockResolvedValue({ status: 200, body: SUCCESS_TOKEN })

    await refreshAccessToken(transport)
    await refreshAccessToken(transport)

    expect(transport).toHaveBeenCalledTimes(2)
  })
})
