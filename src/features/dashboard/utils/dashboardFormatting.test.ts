import { describe, expect, it } from 'vitest'

import { formatDashboardDate } from '@/features/dashboard/utils/dashboardFormatting'

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
