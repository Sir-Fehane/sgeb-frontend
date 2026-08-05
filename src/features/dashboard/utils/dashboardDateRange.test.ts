import { describe, expect, it } from 'vitest'

import {
  MAX_RANGE_DAYS,
  getDefaultDashboardDateFilterState,
  validateDashboardDateRange,
} from '@/features/dashboard/utils/dashboardDateRange'

describe('getDefaultDashboardDateFilterState', () => {
  it('defaults fechaDesde to today and fechaHasta to today + 30 days', () => {
    const { fechaDesde, fechaHasta } = getDefaultDashboardDateFilterState()

    const desde = new Date(fechaDesde)
    const hasta = new Date(fechaHasta)
    const diffDays = Math.round(
      (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24),
    )

    expect(diffDays).toBe(30)
  })
})

describe('validateDashboardDateRange', () => {
  it('accepts a valid, non-inverted range within 366 days', () => {
    expect(
      validateDashboardDateRange({ fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' }),
    ).toBeNull()
  })

  it('rejects an inverted range (fechaDesde after fechaHasta)', () => {
    expect(
      validateDashboardDateRange({ fechaDesde: '2026-02-01', fechaHasta: '2026-01-01' }),
    ).toMatch(/no puede ser posterior/)
  })

  it(`rejects a range wider than ${MAX_RANGE_DAYS} days`, () => {
    expect(
      validateDashboardDateRange({ fechaDesde: '2026-01-01', fechaHasta: '2028-01-01' }),
    ).toMatch(/no puede superar/)
  })

  it('accepts a range exactly at the 366-day boundary', () => {
    expect(
      validateDashboardDateRange({ fechaDesde: '2026-01-01', fechaHasta: '2027-01-02' }),
    ).toBeNull()
  })

  it('rejects invalid date strings', () => {
    expect(
      validateDashboardDateRange({
        fechaDesde: 'no-es-una-fecha',
        fechaHasta: '2026-01-01',
      }),
    ).toMatch(/fechas válidas/)
  })
})
