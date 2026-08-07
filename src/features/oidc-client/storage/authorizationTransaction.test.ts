import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearAuthorizationTransaction,
  consumeAuthorizationTransaction,
  isSafeReturnTo,
  saveAuthorizationTransaction,
} from '@/features/oidc-client/storage/authorizationTransaction'
import type { OidcAuthorizationTransaction } from '@/features/oidc-client/types/transaction'

const VALID_TRANSACTION: OidcAuthorizationTransaction = {
  state: 'a-valid-state-value-1234567890',
  nonce: 'a-valid-nonce-value-1234567890',
  codeVerifier: 'a-valid-code-verifier-1234567890-abcdefghij',
  redirectUri: 'http://localhost:5173/auth/callback',
  returnTo: '/panel',
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('isSafeReturnTo', () => {
  it('accepts a same-origin relative path', () => {
    expect(isSafeReturnTo('/panel')).toBe(true)
    expect(isSafeReturnTo('/reportes?x=1')).toBe(true)
  })

  it('rejects an absolute external URL', () => {
    expect(isSafeReturnTo('https://evil.example/steal')).toBe(false)
  })

  it('rejects a protocol-relative URL', () => {
    expect(isSafeReturnTo('//evil.example/steal')).toBe(false)
  })

  it('rejects a path without a leading slash', () => {
    expect(isSafeReturnTo('panel')).toBe(false)
  })

  it('rejects non-string and empty values', () => {
    expect(isSafeReturnTo('')).toBe(false)
    expect(isSafeReturnTo(undefined)).toBe(false)
    expect(isSafeReturnTo(null)).toBe(false)
    expect(isSafeReturnTo(42)).toBe(false)
  })
})

describe('saveAuthorizationTransaction / consumeAuthorizationTransaction', () => {
  it('saves and reads back an equivalent transaction', () => {
    saveAuthorizationTransaction(VALID_TRANSACTION)

    expect(consumeAuthorizationTransaction()).toEqual(VALID_TRANSACTION)
  })

  it('rejects saving a transaction with an unsafe returnTo', () => {
    expect(() =>
      saveAuthorizationTransaction({
        ...VALID_TRANSACTION,
        returnTo: 'https://evil.example',
      }),
    ).toThrow()
  })

  it('consumes the transaction only once — a second read returns null', () => {
    saveAuthorizationTransaction(VALID_TRANSACTION)

    consumeAuthorizationTransaction()
    expect(consumeAuthorizationTransaction()).toBeNull()
  })

  it('returns null when nothing was ever stored', () => {
    expect(consumeAuthorizationTransaction()).toBeNull()
  })

  it('rejects and removes malformed JSON', () => {
    sessionStorage.setItem('sgeb.oidc.authorization-transaction', '{not valid json')

    expect(consumeAuthorizationTransaction()).toBeNull()
    expect(sessionStorage.getItem('sgeb.oidc.authorization-transaction')).toBeNull()
  })

  it('rejects and removes a structurally mismatched object', () => {
    sessionStorage.setItem(
      'sgeb.oidc.authorization-transaction',
      JSON.stringify({ foo: 'bar' }),
    )

    expect(consumeAuthorizationTransaction()).toBeNull()
    expect(sessionStorage.getItem('sgeb.oidc.authorization-transaction')).toBeNull()
  })

  it('rejects a stored transaction whose returnTo is an external URL', () => {
    sessionStorage.setItem(
      'sgeb.oidc.authorization-transaction',
      JSON.stringify({ ...VALID_TRANSACTION, returnTo: 'https://evil.example' }),
    )

    expect(consumeAuthorizationTransaction()).toBeNull()
  })

  it('never persists any token-like field, even if present on the input object', () => {
    const withExtraFields = {
      ...VALID_TRANSACTION,
      accessToken: 'should-never-be-stored',
      idToken: 'should-never-be-stored',
      refreshToken: 'should-never-be-stored',
    }

    saveAuthorizationTransaction(withExtraFields)

    const raw = sessionStorage.getItem('sgeb.oidc.authorization-transaction')
    expect(raw).not.toContain('accessToken')
    expect(raw).not.toContain('idToken')
    expect(raw).not.toContain('refreshToken')
  })
})

describe('clearAuthorizationTransaction', () => {
  it('removes a stored transaction without needing to read it', () => {
    saveAuthorizationTransaction(VALID_TRANSACTION)

    clearAuthorizationTransaction()

    expect(consumeAuthorizationTransaction()).toBeNull()
  })

  it('is safe to call when nothing is stored', () => {
    expect(() => clearAuthorizationTransaction()).not.toThrow()
  })
})
