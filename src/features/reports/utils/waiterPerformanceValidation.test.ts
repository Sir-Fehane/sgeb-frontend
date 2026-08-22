import { describe, expect, it } from 'vitest'

import { validateWaiterPerformanceDateRange } from '@/features/reports/utils/waiterPerformanceValidation'

describe('validateWaiterPerformanceDateRange', () => {
  it('returns null for a valid, ordered range within the maximum', () => {
    expect(validateWaiterPerformanceDateRange('2026-08-01', '2026-08-31')).toBeNull()
  })

  it('returns null for a single-day range (desde === hasta)', () => {
    expect(validateWaiterPerformanceDateRange('2026-08-01', '2026-08-01')).toBeNull()
  })

  it('flags an inverted range with the same message the backend returns for SGEB-2009', () => {
    expect(validateWaiterPerformanceDateRange('2026-08-31', '2026-08-01')).toBe(
      'El rango de fechas de búsqueda no es válido.',
    )
  })

  it('flags a range beyond 366 days with the same message the backend returns for SGEB-2015', () => {
    expect(validateWaiterPerformanceDateRange('2020-01-01', '2026-01-01')).toBe(
      'El rango de fechas solicitado es demasiado amplio. Acótalo e inténtalo de nuevo.',
    )
  })

  it('accepts a range of exactly 366 days', () => {
    // 2024 is a leap year, so 2024-01-01 -> 2025-01-01 spans exactly 366 days.
    expect(validateWaiterPerformanceDateRange('2024-01-01', '2025-01-01')).toBeNull()
  })

  it('leaves malformed dates to the backend’s own format validation', () => {
    expect(validateWaiterPerformanceDateRange('not-a-date', '2026-08-31')).toBeNull()
  })
})
