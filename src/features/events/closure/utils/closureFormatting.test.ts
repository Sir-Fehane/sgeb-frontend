import { describe, expect, it } from 'vitest'

import {
  formatClosureCurrency,
  formatMermaReportDate,
} from '@/features/events/closure/utils/closureFormatting'

describe('formatClosureCurrency', () => {
  it('formats an amount as MXN currency', () => {
    expect(formatClosureCurrency(320)).toMatch(/\$\s*320\.00/)
  })

  it('formats zero correctly', () => {
    expect(formatClosureCurrency(0)).toMatch(/\$\s*0\.00/)
  })
})

describe('formatMermaReportDate', () => {
  it('formats a UTC date-time string', () => {
    const result = formatMermaReportDate('2026-09-12T23:10:00Z')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats a naive (no-offset) date-time string without throwing', () => {
    expect(() => formatMermaReportDate('2026-09-12T18:00:00')).not.toThrow()
  })
})
