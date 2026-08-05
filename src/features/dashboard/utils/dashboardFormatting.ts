/**
 * Isolated formatting utilities — display-only, never re-derive amounts
 * client-side. The server (`DashboardCapitan.cierre`) already computes
 * every monetary/rating value; this file only formats what it sends.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `cierre.monto_pendiente` / `cierre.merma_costo_estimado` — both documented as MXN. */
export function formatMxn(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/** `cierre.calificacion_promedio` — `null` renders as "Sin calificaciones", never a blank or a zero. */
export function formatRating(rating: number | null): string {
  return rating === null ? 'Sin calificaciones' : `${rating.toFixed(1)} / 5`
}

/**
 * Clamps a percentage to [0, 100] for the *visual* (decorative) width
 * of a coverage bar only — the displayed text always shows the exact
 * source value from `porcentaje_cobertura`, unaltered.
 */
export function clampPercentageForDisplay(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * `rango.fecha_desde` / `rango.fecha_hasta` — a `date`-only ISO string
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

/** `generado_en` / `AlertaOperativa.creada_en` — a full ISO date-time string. */
export function formatDashboardDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
