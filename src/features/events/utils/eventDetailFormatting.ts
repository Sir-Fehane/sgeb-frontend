/**
 * Isolated, display-only formatting for the Event Detail foundation.
 * Deliberately not shared with `features/dashboard`'s own formatters —
 * duplicating these few lines keeps each feature independently owned,
 * the same precedent `features/reports/utils/reportFormatting.ts`
 * already established for the identical MXN-formatting need.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `tarifa_por_mesero` — display only, never a derived payroll/payment calculation. */
export function formatEventTarifa(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/** `radio_geocerca_m` — meters, display only, no map, no distance calculation. */
export function formatEventGeofenceRadius(meters: number): string {
  return `${String(meters)} m`
}

/**
 * `fecha` — a `date`-only ISO string (`YYYY-MM-DD`), formatted as
 * `DD/MM/YYYY` without ever constructing a `Date` from it:
 * `new Date('2026-08-05')` parses as UTC midnight, which rolls back to
 * the previous day once rendered in a negative-offset timezone. Splitting
 * the string avoids that entirely — same pattern as
 * `features/dashboard/utils/dashboardFormatting.ts`'s `formatDashboardDate`.
 */
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatEventDate(dateOnly: string): string {
  const match = DATE_ONLY_PATTERN.exec(dateOnly)
  if (!match) {
    return dateOnly
  }
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/**
 * `inicio` — a full `date-time` string (`EventoCrear.inicio`,
 * `format: date-time`). Unlike `fecha`, the OpenAPI document does not
 * guarantee this value carries no UTC offset — a real backend response
 * could legitimately be naive (`2026-09-12T18:00:00`), UTC
 * (`2026-09-12T18:00:00Z`), or a numeric offset
 * (`2026-09-12T12:00:00-06:00`). This does not need `formatEventDate`'s
 * string-splitting workaround: unlike a bare `YYYY-MM-DD` date (which
 * `Date` always parses as UTC midnight, per the ECMAScript Date Time
 * String Format), a date-*time* string parses per its own offset when one
 * is present, and as local wall-clock time when one is absent — both are
 * exactly the intended instant/value in every case, so delegating
 * straight to `new Date(...)` here is correct for all three forms. See
 * `eventDetailFormatting.test.ts` for tests covering all three,
 * including a same-instant Z/numeric-offset equivalence check.
 */
export function formatEventDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
