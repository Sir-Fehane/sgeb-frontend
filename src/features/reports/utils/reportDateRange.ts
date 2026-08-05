import type { ReportFilterState } from '@/features/reports/types/report'

/**
 * Local validation only — mirrors the one rule that's actually
 * documented for this endpoint (an inverted range doesn't make sense to
 * submit). Deliberately does NOT enforce a maximum span: unlike
 * `GET /dashboard/capitan` (confirmed 366 days), `GET /dashboard/meseros`
 * documents only that SGEB-2015 ("rango demasiado amplio") *can* occur —
 * no specific day limit is written down anywhere, so encoding one here
 * would be inventing an undocumented rule. Never sends a request; the
 * server remains authoritative on the actual limit.
 */
export function validateReportDateRange(filters: ReportFilterState): string | null {
  const desde = new Date(filters.fechaDesde)
  const hasta = new Date(filters.fechaHasta)

  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    return 'Ingresa fechas válidas.'
  }
  if (desde.getTime() > hasta.getTime()) {
    return 'La fecha "desde" no puede ser posterior a la fecha "hasta".'
  }
  return null
}
