import type { DashboardDateFilterState } from '@/features/dashboard/types/dashboard'

/** `GET /dashboard/capitan`'s documented maximum `fecha_desde`..`fecha_hasta` span. */
export const MAX_RANGE_DAYS = 366

const MS_PER_DAY = 1000 * 60 * 60 * 24

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * The documented defaults: `fecha_desde` = today, `fecha_hasta` = today
 * + 30 days. Computed at call time (not a module-level constant) so
 * "today" is always current — used both for the routed page's initial
 * state and for the filters' reset action.
 */
export function getDefaultDashboardDateFilterState(): DashboardDateFilterState {
  const today = new Date()
  const future = new Date(today)
  future.setDate(future.getDate() + 30)
  return { fechaDesde: toIsoDate(today), fechaHasta: toIsoDate(future) }
}

/**
 * Local validation only — mirrors the two rules the endpoint documents
 * (`fecha_desde` must not be after `fecha_hasta`; range ≤ 366 days,
 * SGEB-2015). Returns a user-facing message, or `null` when valid. This
 * never sends a request; the server remains authoritative.
 */
export function validateDashboardDateRange(
  filters: DashboardDateFilterState,
): string | null {
  const desde = new Date(filters.fechaDesde)
  const hasta = new Date(filters.fechaHasta)

  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    return 'Ingresa fechas válidas.'
  }
  if (desde.getTime() > hasta.getTime()) {
    return 'La fecha "desde" no puede ser posterior a la fecha "hasta".'
  }
  const rangeDays = (hasta.getTime() - desde.getTime()) / MS_PER_DAY
  if (rangeDays > MAX_RANGE_DAYS) {
    return `El rango no puede superar ${String(MAX_RANGE_DAYS)} días.`
  }
  return null
}
