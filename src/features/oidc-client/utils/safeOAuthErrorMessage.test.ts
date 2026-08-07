import { describe, expect, it } from 'vitest'

import { getSafeOAuthErrorMessage } from '@/features/oidc-client/utils/safeOAuthErrorMessage'

describe('getSafeOAuthErrorMessage', () => {
  it('maps access_denied to the account-disabled copy', () => {
    expect(getSafeOAuthErrorMessage('access_denied')).toBe(
      'Tu cuenta está desactivada. Contacta a tu capitán.',
    )
  })

  it('maps every documented error code to a non-empty message', () => {
    const codes = [
      'invalid_request',
      'invalid_client',
      'invalid_grant',
      'unauthorized_client',
      'unsupported_grant_type',
      'invalid_scope',
      'access_denied',
      'login_required',
      'server_error',
      'temporarily_unavailable',
    ]

    for (const code of codes) {
      expect(getSafeOAuthErrorMessage(code).length).toBeGreaterThan(0)
    }
  })

  it('falls back to a generic message for an unrecognized or missing code', () => {
    expect(getSafeOAuthErrorMessage('something_unexpected')).toBe(
      'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
    )
    expect(getSafeOAuthErrorMessage(undefined)).toBe(
      'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
    )
  })

  it('never echoes the input value back in the output', () => {
    const rawDescription = 'PKCE fallido: SHA-256(code_verifier) no coincide. sub=abc-123'

    expect(getSafeOAuthErrorMessage(rawDescription)).not.toContain(rawDescription)
  })
})
