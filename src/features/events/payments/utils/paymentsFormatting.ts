/**
 * Isolated, display-only formatting for the Event Payments foundation —
 * each feature owns its own tiny formatter rather than sharing one across
 * features, the same precedent `features/events/closure/utils/
 * closureFormatting.ts` and `features/reports/utils/reportFormatting.ts`
 * already established.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `Pago.monto` — display only, a server-provided snapshot, never a frontend-computed amount. */
export function formatPaymentAmount(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/**
 * `Pago.fecha_pago` — a full date-time string. Delegates straight to
 * `new Date(...)`: it parses per its own offset when present, and as
 * local wall-clock time when absent — same reasoning as
 * `formatMermaReportDate`/`formatEventDateTime`.
 */
export function formatPaymentDate(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
