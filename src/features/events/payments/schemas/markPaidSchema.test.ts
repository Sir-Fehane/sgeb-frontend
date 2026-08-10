import { describe, expect, it } from 'vitest'

import { markPaidSchema } from '@/features/events/payments/schemas/markPaidSchema'

describe('markPaidSchema — referencia', () => {
  it('is required', () => {
    const result = markPaidSchema.safeParse({ referencia: '' })
    expect(result.success).toBe(false)
  })

  it('accepts a single character (minLength 1)', () => {
    const result = markPaidSchema.safeParse({ referencia: 'A' })
    expect(result.success).toBe(true)
  })

  it('accepts exactly 40 characters', () => {
    const result = markPaidSchema.safeParse({ referencia: 'A'.repeat(40) })
    expect(result.success).toBe(true)
  })

  it('rejects 41 characters', () => {
    const result = markPaidSchema.safeParse({ referencia: 'A'.repeat(41) })
    expect(result.success).toBe(false)
  })

  it('rejects spaces', () => {
    const result = markPaidSchema.safeParse({ referencia: 'REF 123' })
    expect(result.success).toBe(false)
  })

  it('rejects symbols outside the documented pattern', () => {
    for (const referencia of ['REF#123', 'REF_123', 'REF.123', 'REF/123']) {
      expect(markPaidSchema.safeParse({ referencia }).success).toBe(false)
    }
  })

  it('accepts letters, digits, and hyphens', () => {
    const result = markPaidSchema.safeParse({ referencia: 'REF-000456' })
    expect(result.success).toBe(true)
  })

  it('accepts lowercase input but normalizes to uppercase in the parsed value', () => {
    const result = markPaidSchema.safeParse({ referencia: 'ref-abc123' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.referencia).toBe('REF-ABC123')
  })
})
