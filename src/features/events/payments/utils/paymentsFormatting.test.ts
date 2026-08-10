import { describe, expect, it } from 'vitest'

import {
  formatPaymentAmount,
  formatPaymentDate,
} from '@/features/events/payments/utils/paymentsFormatting'

describe('formatPaymentAmount', () => {
  it('formats an amount as MXN currency', () => {
    expect(formatPaymentAmount(440)).toMatch(/\$\s*440\.00/)
  })

  it('formats zero correctly', () => {
    expect(formatPaymentAmount(0)).toMatch(/\$\s*0\.00/)
  })
})

describe('formatPaymentDate', () => {
  it('formats a UTC date-time string', () => {
    const result = formatPaymentDate('2026-05-03T15:30:00Z')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats a naive (no-offset) date-time string without throwing', () => {
    expect(() => formatPaymentDate('2026-05-03T15:30:00')).not.toThrow()
  })
})
