import { describe, expect, it } from 'vitest'

import {
  clampPercentageForDisplay,
  formatDashboardDate,
  formatDashboardDateTime,
  formatMxn,
  formatRating,
} from '@/features/dashboard/utils/dashboardFormatting'

describe('formatMxn', () => {
  it('formats a positive amount as MXN currency', () => {
    expect(formatMxn(12500.5)).toContain('12,500.50')
  })

  it('formats zero as a valid amount, not a blank', () => {
    expect(formatMxn(0)).toMatch(/0\.00/)
  })
})

describe('formatRating', () => {
  it('renders "Sin calificaciones" for a null rating', () => {
    expect(formatRating(null)).toBe('Sin calificaciones')
  })

  it('renders a numeric rating out of 5', () => {
    expect(formatRating(4.6)).toBe('4.6 / 5')
  })

  it('renders a zero rating as a valid value, not "Sin calificaciones"', () => {
    expect(formatRating(0)).toBe('0.0 / 5')
  })
})

describe('clampPercentageForDisplay', () => {
  it('passes through an in-range value unchanged', () => {
    expect(clampPercentageForDisplay(83.3)).toBe(83.3)
  })

  it('clamps a value above 100 down to 100', () => {
    expect(clampPercentageForDisplay(120)).toBe(100)
  })

  it('clamps a negative value up to 0', () => {
    expect(clampPercentageForDisplay(-5)).toBe(0)
  })
})

describe('formatDashboardDate', () => {
  it('formats a date-only ISO string as DD/MM/YYYY', () => {
    expect(formatDashboardDate('2026-08-05')).toBe('05/08/2026')
  })

  it('never rolls back a day regardless of the host timezone', () => {
    // A regression guard for the specific bug this utility exists to avoid:
    // `new Date('2026-01-01').toLocaleDateString()` can render "31/12/2025"
    // in a negative-offset timezone. Splitting the string sidesteps that.
    expect(formatDashboardDate('2026-01-01')).toBe('01/01/2026')
  })

  it('returns the original string unchanged if it is not a well-formed date', () => {
    expect(formatDashboardDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDashboardDateTime', () => {
  it('never renders the raw ISO string', () => {
    const isoDateTime = '2026-08-05T09:00:00'
    expect(formatDashboardDateTime(isoDateTime)).not.toBe(isoDateTime)
  })

  it('includes both a date and a time component', () => {
    const formatted = formatDashboardDateTime('2026-08-05T09:00:00')
    expect(formatted).toMatch(/2026/)
    expect(formatted).toMatch(/9:00|09:00/)
  })
})
