import { describe, expect, it } from 'vitest'

import { validateAuditLogDateRange } from '@/features/audit-log/utils/auditLogValidation'

describe('validateAuditLogDateRange', () => {
  it('accepts a valid, in-order range', () => {
    expect(validateAuditLogDateRange('2026-07-01', '2026-07-31')).toBeNull()
  })

  it('rejects a range where fechaHasta is before fechaDesde', () => {
    expect(validateAuditLogDateRange('2026-07-31', '2026-07-01')).toBe(
      'El rango de fechas de búsqueda no es válido.',
    )
  })

  it('rejects a range wider than the backend 366-day maximum', () => {
    expect(validateAuditLogDateRange('2025-01-01', '2026-12-31')).toBe(
      'El rango de fechas solicitado es demasiado amplio (máximo 366 días). Acótalo e inténtalo de nuevo.',
    )
  })

  it('accepts a range exactly at the 366-day maximum', () => {
    expect(validateAuditLogDateRange('2025-01-01', '2026-01-01')).toBeNull()
  })
})
