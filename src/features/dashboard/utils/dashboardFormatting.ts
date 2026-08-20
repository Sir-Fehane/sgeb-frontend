/**
 * `fecha` on a dashboard event row — a `date`-only ISO string
 * (`YYYY-MM-DD`), formatted as `DD/MM/YYYY` without ever constructing a
 * `Date` from it: `new Date('2026-08-05')` parses as UTC midnight, which
 * rolls back to the previous day once rendered in a negative-offset
 * timezone. Splitting the string avoids that entirely.
 */
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatDashboardDate(dateOnly: string): string {
  const match = DATE_ONLY_PATTERN.exec(dateOnly)
  if (!match) {
    return dateOnly
  }
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}
