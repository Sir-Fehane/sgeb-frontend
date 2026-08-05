import { describe, expect, it } from 'vitest'

import { validateReportDateRange } from '@/features/reports/utils/reportDateRange'

describe('validateReportDateRange', () => {
  it('accepts a valid, non-inverted range', () => {
    expect(
      validateReportDateRange({
        fechaDesde: '2026-07-01',
        fechaHasta: '2026-07-31',
        orden: 'calificacion',
      }),
    ).toBeNull()
  })

  it('rejects an inverted range (fechaDesde after fechaHasta)', () => {
    expect(
      validateReportDateRange({
        fechaDesde: '2026-08-01',
        fechaHasta: '2026-07-01',
        orden: 'calificacion',
      }),
    ).toMatch(/no puede ser posterior/)
  })

  it('accepts a very wide range — no undocumented maximum is enforced', () => {
    expect(
      validateReportDateRange({
        fechaDesde: '2020-01-01',
        fechaHasta: '2030-01-01',
        orden: 'calificacion',
      }),
    ).toBeNull()
  })

  it('rejects invalid date strings', () => {
    expect(
      validateReportDateRange({
        fechaDesde: 'no-es-una-fecha',
        fechaHasta: '2026-07-01',
        orden: 'calificacion',
      }),
    ).toMatch(/fechas válidas/)
  })
})
