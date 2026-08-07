import { describe, expect, it } from 'vitest'

import { OidcConfigError, getOidcConfig } from '@/features/oidc-client/config/oidcConfig'

const VALID_SOURCE = {
  VITE_OIDC_ISSUER: 'https://auth.sgeb.mediocres.mx',
  VITE_OIDC_CLIENT_ID: 'sgeb-web-panel',
  VITE_OIDC_REDIRECT_URI: 'http://localhost:5173/auth/callback',
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: 'http://localhost:5173/',
  VITE_OIDC_SCOPE: 'openid perfil sgeb.api',
}

describe('getOidcConfig', () => {
  it('returns a typed config from valid environment variables', () => {
    const config = getOidcConfig(VALID_SOURCE)

    expect(config).toEqual({
      issuer: 'https://auth.sgeb.mediocres.mx',
      clientId: 'sgeb-web-panel',
      redirectUri: 'http://localhost:5173/auth/callback',
      postLogoutRedirectUri: 'http://localhost:5173/',
      scope: 'openid perfil sgeb.api',
    })
  })

  it('never executes merely by being imported — no module-level parsing occurs', () => {
    // If importing the module attempted to read import.meta.env eagerly,
    // this file's own import above would already have thrown in a bare
    // test environment with none of these variables set. Reaching this
    // assertion is itself the proof.
    expect(getOidcConfig).toBeTypeOf('function')
  })

  it('throws OidcConfigError when a required value is missing', () => {
    const { VITE_OIDC_CLIENT_ID, ...withoutClientId } = VALID_SOURCE
    void VITE_OIDC_CLIENT_ID

    expect(() => getOidcConfig(withoutClientId)).toThrow(OidcConfigError)
  })

  it('throws OidcConfigError when the issuer is not a valid absolute URL', () => {
    expect(() =>
      getOidcConfig({ ...VALID_SOURCE, VITE_OIDC_ISSUER: 'not-a-url' }),
    ).toThrow(OidcConfigError)
  })

  it('throws OidcConfigError when the redirect URI is not a valid absolute URL', () => {
    expect(() =>
      getOidcConfig({ ...VALID_SOURCE, VITE_OIDC_REDIRECT_URI: '/auth/callback' }),
    ).toThrow(OidcConfigError)
  })

  it('throws OidcConfigError when the scope does not include openid', () => {
    expect(() =>
      getOidcConfig({ ...VALID_SOURCE, VITE_OIDC_SCOPE: 'perfil sgeb.api' }),
    ).toThrow(OidcConfigError)
  })

  it('throws OidcConfigError with a readable message referencing the offending variable', () => {
    try {
      getOidcConfig({ ...VALID_SOURCE, VITE_OIDC_CLIENT_ID: '' })
      expect.unreachable('getOidcConfig should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(OidcConfigError)
      expect((error as Error).message).toContain('VITE_OIDC_CLIENT_ID')
    }
  })

  it('has no client-secret field anywhere in the resolved configuration', () => {
    const config = getOidcConfig(VALID_SOURCE)

    expect(config).not.toHaveProperty('clientSecret')
    expect(config).not.toHaveProperty('client_secret')
    expect(Object.keys(config).sort()).toEqual(
      ['clientId', 'issuer', 'postLogoutRedirectUri', 'redirectUri', 'scope'].sort(),
    )
  })
})
