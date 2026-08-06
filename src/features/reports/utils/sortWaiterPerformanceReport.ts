import type {
  WaiterPerformanceOrder,
  WaiterPerformanceReportItem,
} from '@/features/reports/types/report'

/**
 * Demo-only local ordering for the routed page's in-memory fixture rows
 * — a stand-in for the server's own `orden` behavior, which future API
 * integration owns for real. Supports exactly the three documented
 * `orden` values; never sorts by name as a hidden fourth option (name is
 * only ever a stable tie-breaker, never the primary key), and never
 * mutates its input array.
 *
 * Higher metric values sort first for every supported order. For
 * `orden=calificacion`, a `null` `calificacionPromedio` (no ratings yet)
 * sorts after every rated waiter — it isn't a "low" rating, so it can't
 * be compared numerically, but it's also not more relevant than an
 * actual rating.
 */
export function sortWaiterPerformanceReport(
  items: readonly WaiterPerformanceReportItem[],
  orden: WaiterPerformanceOrder,
): WaiterPerformanceReportItem[] {
  return [...items].sort((a, b) => {
    const primary = comparePrimary(a, b, orden)
    if (primary !== 0) {
      return primary
    }
    return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es-MX')
  })
}

function comparePrimary(
  a: WaiterPerformanceReportItem,
  b: WaiterPerformanceReportItem,
  orden: WaiterPerformanceOrder,
): number {
  switch (orden) {
    case 'calificacion':
      return compareNullableDescending(a.calificacionPromedio, b.calificacionPromedio)
    case 'asistencias':
      return b.asistenciasConfirmadas - a.asistenciasConfirmadas
    case 'monto_pagado':
      return b.montoPagado - a.montoPagado
  }
}

/** `null` always sorts after any numeric value, regardless of which side it's on. */
function compareNullableDescending(a: number | null, b: number | null): number {
  if (a === null && b === null) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }
  return b - a
}
