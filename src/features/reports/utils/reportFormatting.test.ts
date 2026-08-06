import { describe, expect, it } from 'vitest'

import {
  formatClabeStatus,
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

describe('formatClabeStatus', () => {
  it('renders "Vigente" for true', () => {
    expect(formatClabeStatus(true)).toBe('Vigente')
  })

  it('renders "No vigente" for false', () => {
    expect(formatClabeStatus(false)).toBe('No vigente')
  })
})
