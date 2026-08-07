import { describe, expect, it, vi } from 'vitest'

import {
  fetchUserInfo,
  type UserInfoHttpResponse,
  type UserInfoTransport,
} from '@/features/oidc-client/client/userInfoClient'
import type * as OidcConfigModule from '@/features/oidc-client/config/oidcConfig'

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

const DOCUMENTED_USER = {
  sub: '9f1c2b7e-3d4a-4b5c-8e6f-0a1b2c3d4e5f',
  name: 'Juan Pérez',
  given_name: 'Juan',
  family_name: 'Pérez',
  email: 'capitan@mediocres.mx',
  email_verified: true,
  rol: 'capitan',
}

describe('fetchUserInfo', () => {
  it('sends the access token as a Bearer header', async () => {
    const transport = vi.fn<UserInfoTransport>().mockResolvedValue({
      status: 200,
      body: DOCUMENTED_USER,
    } satisfies UserInfoHttpResponse)

    await fetchUserInfo('the-access-token', transport)

    expect(transport).toHaveBeenCalledWith(
      'https://auth.sgeb.mediocres.mx/userinfo',
      'the-access-token',
    )
  })

  it('parses exactly the documented fields', async () => {
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: DOCUMENTED_USER })

    const result = await fetchUserInfo('token', transport)

    expect(result).toEqual({ outcome: 'success', user: DOCUMENTED_USER })
  })

  it('treats sub as an opaque string — never parsed or transformed', async () => {
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: DOCUMENTED_USER })

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('success')
    if (result.outcome === 'success') {
      expect(result.user.sub).toBe(DOCUMENTED_USER.sub)
      expect(typeof result.user.sub).toBe('string')
    }
  })

  it('fails safely — never authenticates — when rol is present but outside the documented enum', async () => {
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: { ...DOCUMENTED_USER, rol: 'superadmin' } })

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('invalid-response')
  })

  it('fails safely when rol is present but not a string', async () => {
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: { ...DOCUMENTED_USER, rol: 42 } })

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('invalid-response')
  })

  it('succeeds with no rol field when rol is legitimately absent — distinct from an invalid rol', async () => {
    const { rol, ...withoutRol } = DOCUMENTED_USER
    void rol

    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: withoutRol })

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('success')
    if (result.outcome === 'success') {
      expect(result.user.rol).toBeUndefined()
      expect(result.user.sub).toBe(DOCUMENTED_USER.sub)
    }
  })

  it('succeeds with no rol field when rol is explicitly null', async () => {
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: { ...DOCUMENTED_USER, rol: null } })

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('success')
    if (result.outcome === 'success') {
      expect(result.user.rol).toBeUndefined()
    }
  })

  it('succeeds and keeps a documented role value', async () => {
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: DOCUMENTED_USER })

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('success')
    if (result.outcome === 'success') {
      expect(result.user.rol).toBe('capitan')
    }
  })

  it('never invents banking or business data even if the body includes it', async () => {
    const transport = vi.fn<UserInfoTransport>().mockResolvedValue({
      status: 200,
      body: { ...DOCUMENTED_USER, clabe: '012180001234567895', permissions: ['*'] },
    })

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('success')
    if (result.outcome === 'success') {
      expect(result.user).not.toHaveProperty('clabe')
      expect(result.user).not.toHaveProperty('permissions')
    }
  })

  it('parses an ErrorOAuth body on a 401 response', async () => {
    const oauthError = { error: 'invalid_request', error_description: 'Token ausente.' }
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 401, body: oauthError })

    const result = await fetchUserInfo('token', transport)

    expect(result).toEqual({ outcome: 'oauth-error', error: oauthError })
  })

  it('returns a safe network-error result instead of throwing', async () => {
    const transport = vi
      .fn<UserInfoTransport>()
      .mockRejectedValue(new Error('Network Error'))

    const result = await fetchUserInfo('token', transport)

    expect(result.outcome).toBe('network-error')
  })

  it('never performs a real network request in the test suite', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const transport = vi
      .fn<UserInfoTransport>()
      .mockResolvedValue({ status: 200, body: DOCUMENTED_USER })

    await fetchUserInfo('token', transport)

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
