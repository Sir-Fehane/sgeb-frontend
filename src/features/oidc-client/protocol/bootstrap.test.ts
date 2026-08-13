import { describe, expect, it, vi } from 'vitest'

import { bootstrapSession } from '@/features/oidc-client/protocol/bootstrap'

const SUCCESS_TOKEN = {
  access_token: 'the-access-token',
  token_type: 'Bearer' as const,
  expires_in: 900,
}

const DOCUMENTED_USER = { sub: 'uuid-1', rol: 'capitan' as const }

describe('bootstrapSession — restore via refresh', () => {
  it('restores the session when refresh and userinfo both succeed, with no navigation attempted', async () => {
    const refresh = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', user: DOCUMENTED_USER })
    const beginSilentAuthorization = vi.fn()

    const outcome = await bootstrapSession({
      refresh,
      loadUserInfo,
      beginSilentAuthorization,
    })

    expect(outcome).toMatchObject({
      kind: 'restored',
      session: { user: DOCUMENTED_USER },
    })
    expect(loadUserInfo).toHaveBeenCalledWith('the-access-token')
    expect(beginSilentAuthorization).not.toHaveBeenCalled()
  })

  it('never includes a refresh_token field on the restored session payload', async () => {
    const refresh = vi.fn().mockResolvedValue({
      outcome: 'success',
      token: { ...SUCCESS_TOKEN, refresh_token: 'sneaky' },
    })
    const loadUserInfo = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', user: DOCUMENTED_USER })

    const outcome = await bootstrapSession({ refresh, loadUserInfo })

    expect(outcome.kind).toBe('restored')
    if (outcome.kind === 'restored') {
      expect(outcome.session).not.toHaveProperty('refresh_token')
      expect(outcome.session).not.toHaveProperty('refreshToken')
    }
  })

  it('degrades to anonymous when refresh succeeds but userinfo fails — does not fall back to prompt=none', async () => {
    const refresh = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi.fn().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos cargar tu perfil.',
    })
    const beginSilentAuthorization = vi.fn()

    const outcome = await bootstrapSession({
      refresh,
      loadUserInfo,
      beginSilentAuthorization,
    })

    expect(outcome).toEqual({ kind: 'anonymous' })
    expect(beginSilentAuthorization).not.toHaveBeenCalled()
  })
})

describe('bootstrapSession — fallback to prompt=none', () => {
  it('attempts a silent authorization request when refresh returns an oauth-error', async () => {
    const refresh = vi.fn().mockResolvedValue({
      outcome: 'oauth-error',
      error: { error: 'invalid_grant', sso_code: 'SSO-1006' },
    })
    const beginSilentAuthorization = vi
      .fn()
      .mockResolvedValue('https://auth.example/authorize')

    const outcome = await bootstrapSession({ refresh, beginSilentAuthorization })

    expect(beginSilentAuthorization).toHaveBeenCalledWith({ prompt: 'none' })
    expect(outcome).toEqual({ kind: 'silent-redirect' })
  })

  it('attempts a silent authorization request when refresh returns a network-error', async () => {
    const refresh = vi.fn().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos renovar tu sesión.',
    })
    const beginSilentAuthorization = vi
      .fn()
      .mockResolvedValue('https://auth.example/authorize')

    const outcome = await bootstrapSession({ refresh, beginSilentAuthorization })

    expect(beginSilentAuthorization).toHaveBeenCalledWith({ prompt: 'none' })
    expect(outcome).toEqual({ kind: 'silent-redirect' })
  })

  it('degrades toward the safe provider-session strategy — not a retry loop — after a local cross-tab coordination failure', async () => {
    // Mirrors exactly what `client/tokenClient.ts` resolves to when
    // `session/refreshLock.ts` cannot establish cross-tab coordination
    // (unsupported browser, timed-out wait, or a lock-manager failure):
    // a `network-error` TokenResult, never a call to the `/token`
    // transport. Bootstrap must treat this the same as any other refresh
    // failure — exactly one refresh attempt, then move to `prompt=none`.
    const refresh = vi.fn().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos coordinar la renovación de tu sesión entre pestañas.',
    })
    const beginSilentAuthorization = vi
      .fn()
      .mockResolvedValue('https://auth.example/authorize')

    const outcome = await bootstrapSession({ refresh, beginSilentAuthorization })

    expect(refresh).toHaveBeenCalledOnce()
    expect(beginSilentAuthorization).toHaveBeenCalledOnce()
    expect(beginSilentAuthorization).toHaveBeenCalledWith({ prompt: 'none' })
    expect(outcome).toEqual({ kind: 'silent-redirect' })
  })

  it('treats SSO-1007 (refresh reuse) as an ordinary refresh failure — one attempt, then prompt=none, never a retry loop', async () => {
    const refresh = vi.fn().mockResolvedValue({
      outcome: 'oauth-error',
      error: { error: 'invalid_grant', sso_code: 'SSO-1007' },
    })
    const beginSilentAuthorization = vi
      .fn()
      .mockResolvedValue('https://auth.example/authorize')

    const outcome = await bootstrapSession({ refresh, beginSilentAuthorization })

    expect(refresh).toHaveBeenCalledOnce()
    expect(beginSilentAuthorization).toHaveBeenCalledOnce()
    expect(outcome).toEqual({ kind: 'silent-redirect' })
  })
})

describe('bootstrapSession — never crashes application startup', () => {
  it('degrades to anonymous when refresh itself throws (e.g. missing configuration), without attempting prompt=none', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('Invalid OIDC configuration.'))
    const beginSilentAuthorization = vi.fn()

    const outcome = await bootstrapSession({ refresh, beginSilentAuthorization })

    expect(outcome).toEqual({ kind: 'anonymous' })
    expect(beginSilentAuthorization).not.toHaveBeenCalled()
  })

  it('degrades to anonymous when the silent authorization attempt itself throws', async () => {
    const refresh = vi.fn().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos renovar tu sesión.',
    })
    const beginSilentAuthorization = vi
      .fn()
      .mockRejectedValue(new Error('Invalid OIDC configuration.'))

    const outcome = await bootstrapSession({ refresh, beginSilentAuthorization })

    expect(outcome).toEqual({ kind: 'anonymous' })
  })

  it('degrades to anonymous when loadUserInfo throws unexpectedly after a successful refresh', async () => {
    const refresh = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi.fn().mockRejectedValue(new Error('unexpected'))

    const outcome = await bootstrapSession({ refresh, loadUserInfo })

    expect(outcome).toEqual({ kind: 'anonymous' })
  })
})
