/**
 * Client-side mirror of `bitacora_controller.ts`/`BitacoraService`'s
 * date-range rule (pinned backend, `bitacora_service.ts`) — narrows an
 * obviously-invalid request before it ever reaches the network. Same
 * shape/copy as `features/reports/utils/waiterPerformanceValidation.ts`'s
 * identical 366-day cap, duplicated locally rather than imported — this
 * feature has no dependency on `reports`, and the two 366-day limits are
 * separate backend rules (`ReporteService.desempenoMeseros` vs.
 * `BitacoraService.listar`) that only happen to share the same number
 * today. The backend remains authoritative: this never blocks a request
 * the backend would accept.
 */
const MAX_RANGO_DIAS = 366

const RANGO_INVALIDO_MENSAJE = 'El rango de fechas de búsqueda no es válido.'
const RANGO_DEMASIADO_AMPLIO_MENSAJE =
  'El rango de fechas solicitado es demasiado amplio (máximo 366 días). Acótalo e inténtalo de nuevo.'

/** `YYYY-MM-DD` parsed as local midnight — malformed input resolves to `NaN`, left for the backend's own format validation. */
function parseDateOnly(value: string): number {
  return new Date(`${value}T00:00:00`).getTime()
}

/**
 * Returns a user-facing error message when `fechaHasta` is before
 * `fechaDesde`, or when the range exceeds the backend's 366-day maximum —
 * `null` when the range is valid (or when either date doesn't parse).
 */
export function validateAuditLogDateRange(
  fechaDesde: string,
  fechaHasta: string,
): string | null {
  const desde = parseDateOnly(fechaDesde)
  const hasta = parseDateOnly(fechaHasta)
  if (Number.isNaN(desde) || Number.isNaN(hasta)) {
    return null
  }
  if (hasta < desde) {
    return RANGO_INVALIDO_MENSAJE
  }
  const dias = (hasta - desde) / (1000 * 60 * 60 * 24)
  if (dias > MAX_RANGO_DIAS) {
    return RANGO_DEMASIADO_AMPLIO_MENSAJE
  }
  return null
}
