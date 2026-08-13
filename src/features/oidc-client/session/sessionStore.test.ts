import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyRefreshedAccessToken,
  getOidcAccessToken,
  resetOidcSession,
  useOidcSessionStore,
} from '@/features/oidc-client/session/sessionStore'

beforeEach(() => {
  resetOidcSession()
})

describe('useOidcSessionStore', () => {
  it('starts idle', () => {
    expect(useOidcSessionStore.getState().session).toEqual({ status: 'idle' })
  })

  it('transitions to authenticating', () => {
    useOidcSessionStore.getState().setAuthenticating()

    expect(useOidcSessionStore.getState().session).toEqual({ status: 'authenticating' })
  })

  it('transitions to authenticated with the access token kept only in memory', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'the-access-token',
      accessTokenExpiresAt: Date.now() + 900_000,
      scope: 'openid perfil sgeb.api',
      user: { sub: 'uuid-1', rol: 'capitan' },
    })

    const session = useOidcSessionStore.getState().session
    expect(session.status).toBe('authenticated')
    if (session.status === 'authenticated') {
      expect(session.accessToken).toBe('the-access-token')
      expect(session.user.sub).toBe('uuid-1')
    }
  })

  it('never exposes a refreshToken field on the authenticated session', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'the-access-token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'uuid-1' },
    })

    expect(useOidcSessionStore.getState().session).not.toHaveProperty('refreshToken')
  })

  it('transitions to anonymous', () => {
    useOidcSessionStore.getState().setAnonymous()

    expect(useOidcSessionStore.getState().session).toEqual({ status: 'anonymous' })
  })

  it('transitions to error with a safe message', () => {
    useOidcSessionStore.getState().setError('No pudimos iniciar sesión.')

    expect(useOidcSessionStore.getState().session).toEqual({
      status: 'error',
      message: 'No pudimos iniciar sesión.',
    })
  })

  it('resets back to idle from any state', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'uuid-1' },
    })

    resetOidcSession()

    expect(useOidcSessionStore.getState().session).toEqual({ status: 'idle' })
  })

  it('never writes to localStorage or sessionStorage', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'the-access-token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'uuid-1' },
    })

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.getItem('the-access-token')).toBeNull()
  })
})

describe('getOidcAccessToken', () => {
  it('returns undefined when there is no authenticated session', () => {
    expect(getOidcAccessToken()).toBeUndefined()

    useOidcSessionStore.getState().setAnonymous()
    expect(getOidcAccessToken()).toBeUndefined()
  })

  it('returns the current access token when authenticated', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'the-access-token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'uuid-1' },
    })

    expect(getOidcAccessToken()).toBe('the-access-token')
  })
})

describe('applyRefreshedAccessToken', () => {
  it('returns false and leaves state unchanged when not authenticated', () => {
    useOidcSessionStore.getState().setAnonymous()

    const applied = applyRefreshedAccessToken({
      accessToken: 'new-token',
      accessTokenExpiresAt: Date.now() + 900_000,
    })

    expect(applied).toBe(false)
    expect(useOidcSessionStore.getState().session).toEqual({ status: 'anonymous' })
  })

  it('updates the access token while preserving the existing user', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'old-token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'uuid-1', rol: 'capitan' },
    })

    const applied = applyRefreshedAccessToken({
      accessToken: 'new-token',
      accessTokenExpiresAt: Date.now() + 1_800_000,
      scope: 'openid perfil sgeb.api',
    })

    expect(applied).toBe(true)
    const session = useOidcSessionStore.getState().session
    expect(session.status).toBe('authenticated')
    if (session.status === 'authenticated') {
      expect(session.accessToken).toBe('new-token')
      expect(session.user).toEqual({ sub: 'uuid-1', rol: 'capitan' })
      expect(session.scope).toBe('openid perfil sgeb.api')
    }
  })
})
