import { describe, expect, it } from 'vitest'

import {
  formatReportDateTime,
  formatReportMxn,
  formatReportRating,
} from '@/features/reports/utils/reportFormatting'

describe('formatReportMxn', () => {
  it('formats a positive amount as MXN currency', () => {
    expect(formatReportMxn(6000)).toContain('6,000.00')
  })

  it('formats zero as a valid amount, not a blank', () => {
    expect(formatReportMxn(0)).toMatch(/0\.00/)
  })
})

describe('formatReportRating', () => {
  it('renders "Sin calificaciones" for a null rating', () => {
    expect(formatReportRating(null)).toBe('Sin calificaciones')
  })

  it('renders a numeric rating out of 5', () => {
    expect(formatReportRating(4.8)).toBe('4.8 / 5')
  })

  it('renders a zero rating as a valid value, not "Sin calificaciones"', () => {
    expect(formatReportRating(0)).toBe('0.0 / 5')
  })
})

describe('formatReportDateTime', () => {
  it('formats a full date-time string as a readable date and time', () => {
    const formatted = formatReportDateTime('2026-07-15T18:30:00.000-06:00')
    expect(formatted.length).toBeGreaterThan(0)
  })
})
