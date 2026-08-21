import { beforeEach, describe, expect, it } from 'vitest'

import {
  hasSubmittedRating,
  markRatingSubmitted,
  readStoredTokenComensal,
  writeStoredTokenComensal,
} from '@/features/public-diner/services/tokenComensalStorage'

beforeEach(() => {
  window.localStorage.clear()
})

describe('tokenComensalStorage', () => {
  it('returns undefined when nothing is stored for this QR', () => {
    expect(readStoredTokenComensal('qr-1')).toBeUndefined()
  })

  it('round-trips a written token', () => {
    writeStoredTokenComensal('qr-1', 'a1b2c3d4-e5f6-4a1b-8c2d-000000000001')
    expect(readStoredTokenComensal('qr-1')).toBe('a1b2c3d4-e5f6-4a1b-8c2d-000000000001')
  })

  it('keys storage per QR — a token for one table is never read for another', () => {
    writeStoredTokenComensal('qr-1', 'a1b2c3d4-e5f6-4a1b-8c2d-000000000001')
    expect(readStoredTokenComensal('qr-2')).toBeUndefined()
  })

  it('rejects a non-UUID-v4 value as corrupted/tampered storage content', () => {
    window.localStorage.setItem('sgeb:token:qr-1', 'not-a-uuid')
    expect(readStoredTokenComensal('qr-1')).toBeUndefined()
  })

  it('reports no submitted rating for a QR nothing was marked for', () => {
    expect(hasSubmittedRating('qr-1')).toBe(false)
  })

  it('round-trips a marked rating submission', () => {
    markRatingSubmitted('qr-1')
    expect(hasSubmittedRating('qr-1')).toBe(true)
  })

  it('keys the rating-submitted marker per QR — marking one table never marks another', () => {
    markRatingSubmitted('qr-1')
    expect(hasSubmittedRating('qr-2')).toBe(false)
  })

  it('never infers a submitted rating merely from a stored token_comensal', () => {
    writeStoredTokenComensal('qr-1', 'a1b2c3d4-e5f6-4a1b-8c2d-000000000001')
    expect(hasSubmittedRating('qr-1')).toBe(false)
  })
})
