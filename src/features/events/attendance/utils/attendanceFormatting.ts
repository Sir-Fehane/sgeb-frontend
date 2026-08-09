/**
 * Isolated, display-only formatting for `ConfirmacionLlegada.timestamp` —
 * a server-assigned UTC date-time (docs/FrontendArchitecture.md's
 * established "server-computed timestamps are UTC" convention). Not
 * shared with `features/events/utils/eventDetailFormatting.ts`'s
 * `formatEventDateTime` — same "each feature owns its own tiny
 * formatter" precedent already established by
 * `features/reports/utils/reportFormatting.ts`.
 *
 * Delegates straight to native `Date` parsing, exactly like
 * `formatEventDateTime` — correct for every valid ISO 8601 date-time
 * form (naive, `Z`, or a numeric offset): a date-*time* string (unlike a
 * bare `YYYY-MM-DD` date) parses per its own offset when present, and as
 * local wall-clock time when absent, per the ECMAScript Date Time String
 * Format. This code does not assume the value always carries (or always
 * omits) an explicit UTC offset.
 */
export function formatArrivalTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
