/**
 * Client-side mirror of `desempenoValidator`/`ReporteService.desempenoMeseros`'s
 * date-range rules (pinned backend, `reporte_service.ts`) — narrows an
 * obviously-invalid request before it ever reaches the network. Reuses the
 * exact same user-facing copy the backend itself returns for
 * `SGEB-2009`/`SGEB-2015` (`catalogo.ts`), so the message is identical
 * whichever side actually catches a given case. The backend remains
 * authoritative: this never blocks a request the backend would accept, and
 * any case this helper doesn't catch still gets a clear message from the
 * real `SgebApplicationError` (see `services/reportsApi.ts`).
 */
const MAX_RANGO_DIAS = 366

const RANGO_INVALIDO_MENSAJE = 'El rango de fechas de búsqueda no es válido.'
const RANGO_DEMASIADO_AMPLIO_MENSAJE =
  'El rango de fechas solicitado es demasiado amplio. Acótalo e inténtalo de nuevo.'

/** `YYYY-MM-DD` parsed as local midnight — malformed input resolves to `NaN`, deliberately left for the backend's own format validation (`SGEB-2001`/`SGEB-2002`) rather than guessed at here. */
function parseDateOnly(value: string): number {
  return new Date(`${value}T00:00:00`).getTime()
}

/**
 * Returns a user-facing error message when `fechaHasta` is before
 * `fechaDesde`, or when the range exceeds the backend's 366-day maximum —
 * `null` when the range is valid (or when either date doesn't parse, since
 * that case belongs to the backend's own validation).
 */
export function validateWaiterPerformanceDateRange(
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
