import { beforeEach, describe, expect, it, vi } from 'vitest'

import { processAuthorizationCallback } from '@/features/oidc-client/protocol/callback'
import { saveAuthorizationTransaction } from '@/features/oidc-client/storage/authorizationTransaction'
import type { OidcAuthorizationTransaction } from '@/features/oidc-client/types/transaction'

const TRANSACTION: OidcAuthorizationTransaction = {
  state: 'the-original-state',
  nonce: 'the-original-nonce',
  codeVerifier: 'the-original-code-verifier',
  redirectUri: 'http://localhost:5173/auth/callback',
  returnTo: '/reportes',
}

const SUCCESS_TOKEN = {
  access_token: 'the-access-token',
  token_type: 'Bearer' as const,
  expires_in: 900,
  id_token: 'the-id-token',
  scope: 'openid perfil sgeb.api',
}

const DOCUMENTED_USER = { sub: 'uuid-1', name: 'Juan Pérez', rol: 'capitan' as const }

beforeEach(() => {
  sessionStorage.clear()
})

describe('processAuthorizationCallback — valid success path', () => {
  it('exchanges the code exactly once when state matches a stored transaction', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', user: DOCUMENTED_USER })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange, loadUserInfo },
    )

    expect(exchange).toHaveBeenCalledOnce()
    expect(exchange).toHaveBeenCalledWith({
      code: 'auth-code',
      redirectUri: TRANSACTION.redirectUri,
      codeVerifier: TRANSACTION.codeVerifier,
    })
    expect(outcome.kind).toBe('success')
  })

  it('loads UserInfo after a successful exchange and includes it in the session payload', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', user: DOCUMENTED_USER })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange, loadUserInfo },
    )

    expect(loadUserInfo).toHaveBeenCalledWith('the-access-token')
    expect(outcome).toMatchObject({ kind: 'success', session: { user: DOCUMENTED_USER } })
  })

  it('uses the validated returnTo from the stored transaction', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', user: DOCUMENTED_USER })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange, loadUserInfo },
    )

    expect(outcome).toMatchObject({ kind: 'success', returnTo: '/reportes' })
  })

  it('never includes a refresh_token field on the success session payload', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi.fn().mockResolvedValue({
      outcome: 'success',
      token: { ...SUCCESS_TOKEN, refresh_token: 'sneaky' },
    })
    const loadUserInfo = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', user: DOCUMENTED_USER })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange, loadUserInfo },
    )

    expect(outcome.kind).toBe('success')
    if (outcome.kind === 'success') {
      expect(outcome.session).not.toHaveProperty('refresh_token')
      expect(outcome.session).not.toHaveProperty('refreshToken')
    }
  })
})

describe('processAuthorizationCallback — invalid callback', () => {
  it('never exchanges when the code is missing', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi.fn()

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: null },
      { exchange },
    )

    expect(exchange).not.toHaveBeenCalled()
    expect(outcome.kind).toBe('error')
  })

  it('never exchanges when the state is missing', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi.fn()

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: null, error: null },
      { exchange },
    )

    expect(exchange).not.toHaveBeenCalled()
    expect(outcome.kind).toBe('error')
  })

  it('never exchanges when no transaction was stored', async () => {
    const exchange = vi.fn()

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'some-state', error: null },
      { exchange },
    )

    expect(exchange).not.toHaveBeenCalled()
    expect(outcome.kind).toBe('error')
  })

  it('never exchanges when the returned state does not match the stored transaction', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi.fn()

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'a-different-state', error: null },
      { exchange },
    )

    expect(exchange).not.toHaveBeenCalled()
    expect(outcome.kind).toBe('error')
  })

  it('offers a restart action for every invalid-callback case', async () => {
    const outcome = await processAuthorizationCallback(
      { code: null, state: null, error: null },
      {},
    )

    expect(outcome).toMatchObject({ kind: 'error', canRestart: true })
  })
})

describe('processAuthorizationCallback — provider error callback', () => {
  it('never exchanges and renders a safe mapped message', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi.fn()

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: 'access_denied' },
      { exchange },
    )

    expect(exchange).not.toHaveBeenCalled()
    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'Tu cuenta está desactivada. Contacta a tu capitán.',
    })
  })

  it('never displays the raw error_description', async () => {
    const rawDescription = 'PKCE fallido: SHA-256(code_verifier) no coincide. sub=abc-123'

    const outcome = await processAuthorizationCallback(
      { code: null, state: null, error: 'invalid_grant' },
      {},
    )

    expect(outcome.kind).toBe('error')
    if (outcome.kind === 'error') {
      expect(outcome.message).not.toContain(rawDescription)
      expect(outcome.message).not.toContain('sub=abc-123')
    }
  })
})

describe('processAuthorizationCallback — token exchange failures', () => {
  it('surfaces a safe message for an OAuth error from /token', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi.fn().mockResolvedValue({
      outcome: 'oauth-error',
      error: { error: 'invalid_grant', sso_code: 'SSO-1015' },
    })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange },
    )

    expect(outcome.kind).toBe('error')
    if (outcome.kind === 'error') {
      expect(outcome.message).not.toContain('SSO-1015')
    }
  })

  it('surfaces a safe message for a network failure from /token', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi.fn().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos comunicarnos con el proveedor de identidad.',
    })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange },
    )

    expect(outcome.kind).toBe('error')
  })

  it('surfaces a safe message when UserInfo fails after a successful exchange', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi.fn().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos cargar tu perfil.',
    })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange, loadUserInfo },
    )

    expect(outcome.kind).toBe('error')
  })

  it('never authenticates from an invalid UserInfo response (e.g. an undocumented rol)', async () => {
    saveAuthorizationTransaction(TRANSACTION)
    const exchange = vi
      .fn()
      .mockResolvedValue({ outcome: 'success', token: SUCCESS_TOKEN })
    const loadUserInfo = vi.fn().mockResolvedValue({
      outcome: 'invalid-response',
      message: 'No pudimos verificar tu perfil. Vuelve a intentarlo.',
    })

    const outcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange, loadUserInfo },
    )

    expect(outcome.kind).toBe('error')
  })
})

describe('processAuthorizationCallback — silent (prompt=none) login_required retry', () => {
  const SILENT_TRANSACTION: OidcAuthorizationTransaction = {
    ...TRANSACTION,
    silent: true,
  }

  it('returns retry-visible for login_required when the consumed transaction was silent', async () => {
    saveAuthorizationTransaction(SILENT_TRANSACTION)
    const exchange = vi.fn()

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: 'login_required' },
      { exchange },
    )

    expect(exchange).not.toHaveBeenCalled()
    expect(outcome).toEqual({ kind: 'retry-visible', returnTo: '/reportes' })
  })

  it('does not retry-visible for a different error on a silent transaction — shows the normal error', async () => {
    saveAuthorizationTransaction(SILENT_TRANSACTION)

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: 'access_denied' },
      {},
    )

    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'Tu cuenta está desactivada. Contacta a tu capitán.',
    })
  })

  it('does not retry-visible for login_required on a normal (non-silent) transaction', async () => {
    saveAuthorizationTransaction(TRANSACTION)

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: 'login_required' },
      {},
    )

    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'Necesitas iniciar sesión para continuar.',
    })
  })

  it('does not retry-visible when the state does not verify, even for a silent transaction', async () => {
    saveAuthorizationTransaction(SILENT_TRANSACTION)

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'a-different-state', error: 'login_required' },
      {},
    )

    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
    })
  })

  it('still consumes the transaction on a retry-visible outcome, bounding it to a single automatic retry', async () => {
    saveAuthorizationTransaction(SILENT_TRANSACTION)

    await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: 'login_required' },
      {},
    )

    const secondOutcome = await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: 'login_required' },
      {},
    )

    expect(secondOutcome).toMatchObject({ kind: 'error' })
  })
})

describe('processAuthorizationCallback — provider error state verification', () => {
  it('trusts and maps the specific provider error when state matches a stored transaction', async () => {
    saveAuthorizationTransaction(TRANSACTION)

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'the-original-state', error: 'access_denied' },
      {},
    )

    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'Tu cuenta está desactivada. Contacta a tu capitán.',
    })
  })

  it('falls back to the generic message when the provider error state does not match the stored transaction', async () => {
    saveAuthorizationTransaction(TRANSACTION)

    const outcome = await processAuthorizationCallback(
      { code: null, state: 'a-different-state', error: 'access_denied' },
      {},
    )

    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
    })
  })

  it('falls back to the generic message when a provider error arrives with no stored transaction at all', async () => {
    const outcome = await processAuthorizationCallback(
      { code: null, state: null, error: 'access_denied' },
      {},
    )

    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
    })
  })

  it('falls back to the generic message when a provider error arrives with a transaction stored but no state param', async () => {
    saveAuthorizationTransaction(TRANSACTION)

    const outcome = await processAuthorizationCallback(
      { code: null, state: null, error: 'invalid_grant' },
      {},
    )

    expect(outcome).toMatchObject({
      kind: 'error',
      message: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
    })
  })

  it('still consumes (clears) the transaction on a provider error, regardless of state match', async () => {
    saveAuthorizationTransaction(TRANSACTION)

    await processAuthorizationCallback(
      { code: null, state: 'a-different-state', error: 'access_denied' },
      {},
    )

    // A second callback attempt must find no leftover transaction.
    const secondOutcome = await processAuthorizationCallback(
      { code: 'auth-code', state: 'the-original-state', error: null },
      { exchange: vi.fn() },
    )

    expect(secondOutcome.kind).toBe('error')
  })
})
