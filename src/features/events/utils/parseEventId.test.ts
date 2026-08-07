import { describe, expect, it } from 'vitest'

import { parseEventId } from '@/features/events/utils/parseEventId'

describe('parseEventId', () => {
  it('accepts a positive integer', () => {
    expect(parseEventId('1001')).toBe(1001)
    expect(parseEventId('1')).toBe(1)
  })

  it('rejects an empty value', () => {
    expect(parseEventId('')).toBeNull()
    expect(parseEventId(undefined)).toBeNull()
  })

  it('rejects zero', () => {
    expect(parseEventId('0')).toBeNull()
  })

  it('rejects a negative value', () => {
    expect(parseEventId('-1')).toBeNull()
  })

  it('rejects a decimal value', () => {
    expect(parseEventId('1001.5')).toBeNull()
  })

  it('rejects a non-numeric value', () => {
    expect(parseEventId('abc')).toBeNull()
    expect(parseEventId('1001abc')).toBeNull()
  })

  it('rejects an unsafe integer value', () => {
    expect(parseEventId('99999999999999999999')).toBeNull()
  })

  it('rejects a leading-zero value (e.g. "01") as not a canonical positive integer', () => {
    expect(parseEventId('01')).toBeNull()
  })

  it('rejects scientific-notation and hex-like strings', () => {
    expect(parseEventId('1e3')).toBeNull()
    expect(parseEventId('0x10')).toBeNull()
  })

  it('rejects whitespace-padded values', () => {
    expect(parseEventId(' 1001 ')).toBeNull()
  })
})
