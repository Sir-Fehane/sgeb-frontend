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
