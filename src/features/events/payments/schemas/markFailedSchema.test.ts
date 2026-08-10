import { describe, expect, it } from 'vitest'

import { markFailedSchema } from '@/features/events/payments/schemas/markFailedSchema'

describe('markFailedSchema — motivo', () => {
  it('is required', () => {
    expect(markFailedSchema.safeParse({ motivo: '' }).success).toBe(false)
  })

  it('rejects fewer than 3 characters', () => {
    expect(markFailedSchema.safeParse({ motivo: 'ab' }).success).toBe(false)
  })

  it('accepts exactly 3 characters', () => {
    expect(markFailedSchema.safeParse({ motivo: 'abc' }).success).toBe(true)
  })

  it('accepts exactly 200 characters', () => {
    expect(markFailedSchema.safeParse({ motivo: 'a'.repeat(200) }).success).toBe(true)
  })

  it('rejects 201 characters', () => {
    expect(markFailedSchema.safeParse({ motivo: 'a'.repeat(201) }).success).toBe(false)
  })
})
