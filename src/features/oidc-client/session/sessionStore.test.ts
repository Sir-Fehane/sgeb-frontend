import { beforeEach, describe, expect, it } from 'vitest'

import {
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
