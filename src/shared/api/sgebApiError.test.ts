import { describe, expect, it } from 'vitest'

import {
  isSessionExpiredError,
  isSgebApplicationError,
  isSgebNetworkError,
  SgebApplicationError,
  SgebNetworkError,
} from '@/shared/api/sgebApiError'

describe('isSessionExpiredError', () => {
  it('is true for a SgebApplicationError carrying SGEB-1002', () => {
    const error = new SgebApplicationError(401, {
      code: 'SGEB-1002',
      message: 'Tu sesión ha expirado.',
    })

    expect(isSessionExpiredError(error)).toBe(true)
    // Still a SgebApplicationError — this is a narrowing helper, not a
    // different error kind.
    expect(isSgebApplicationError(error)).toBe(true)
  })

  it('is false for any other SGEB application error code', () => {
    const forbidden = new SgebApplicationError(403, {
      code: 'SGEB-1004',
      message: 'No tienes permisos.',
    })
    const businessRule = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'Estado inválido.',
    })

    expect(isSessionExpiredError(forbidden)).toBe(false)
    expect(isSessionExpiredError(businessRule)).toBe(false)
  })

  it('is false for a SgebNetworkError', () => {
    const error = new SgebNetworkError('No pudimos comunicarnos con el servidor.')

    expect(isSessionExpiredError(error)).toBe(false)
    expect(isSgebNetworkError(error)).toBe(true)
  })

  it('is false for a non-SGEB value', () => {
    expect(isSessionExpiredError(new Error('boom'))).toBe(false)
    expect(isSessionExpiredError(undefined)).toBe(false)
    expect(isSessionExpiredError(null)).toBe(false)
  })
})
