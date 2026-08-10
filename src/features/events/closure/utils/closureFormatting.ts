/**
 * Isolated, display-only formatting for the Event Closure foundation —
 * each feature owns its own tiny formatter rather than sharing one across
 * features, the same precedent `features/events/utils/eventDetailFormatting.ts`
 * and `features/reports/utils/reportFormatting.ts` already established.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `costo_estimado` — display only, never a payroll/payment deduction. */
export function formatClosureCurrency(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/**
 * A merma report's presentation-only `fecha` (see `types/closure.ts`'s
 * comment on `MermaReportViewModel.fecha`). Delegates straight to
 * `new Date(...)`: a full date-time string parses per its own offset when
 * present, and as local wall-clock time when absent — same reasoning as
 * `formatEventDateTime`.
 */
export function formatMermaReportDate(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
