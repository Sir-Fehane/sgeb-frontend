/**
 * Isolated, display-only formatting for the Reports feature — each
 * feature owns its own tiny formatter rather than sharing one across
 * features, same precedent `features/events/closure/utils/closureFormatting.ts`
 * already established.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `costo_total` — display only, never a payroll/payment deduction. */
export function formatReportMxn(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/** `promedio` — `null` renders as "Sin calificaciones", never a blank or a zero. */
export function formatReportRating(rating: number | null): string {
  return rating === null ? 'Sin calificaciones' : `${rating.toFixed(1)} / 5`
}

/** A calificación's `creada_en` — a full date-time string. */
export function formatReportDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * `segundos_respuesta_promedio` — `null` renders as "Sin datos", never as
 * "0 s" (same null-vs-zero reasoning `formatReportRating` already applies
 * to `promedio_calificacion`). This is the time until a solicitud is
 * MARKED atendida in the database, not physical arrival at the table (see
 * `reporte_service.ts`'s own comment) — the label callers pair this with
 * must reflect that, this formatter only renders the duration itself.
 */
export function formatReportResponseTime(seconds: number | null): string {
  if (seconds === null) {
    return 'Sin datos'
  }
  const totalSeconds = Math.round(seconds)
  if (totalSeconds < 60) {
    return `${String(totalSeconds)} s`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return remainingSeconds === 0
    ? `${String(minutes)} min`
    : `${String(minutes)} min ${String(remainingSeconds)} s`
}
