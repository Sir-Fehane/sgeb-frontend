/**
 * Isolated formatting utilities for the waiter-performance report —
 * display-only, never re-derives amounts client-side. Deliberately not
 * shared with `features/dashboard`'s own formatters: duplicating these
 * few lines keeps each feature independently owned, per this branch's
 * explicit instruction not to refactor Captain Dashboard merely to
 * deduplicate a small formatter.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `monto_pagado` / `monto_pendiente` — both documented as MXN. Zero is a valid amount. */
export function formatReportMxn(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/** `calificacion_promedio` — `null` renders as "Sin calificaciones", never a blank or a zero. */
export function formatReportRating(rating: number | null): string {
  return rating === null ? 'Sin calificaciones' : `${rating.toFixed(1)} / 5`
}

/** `clabe_vigente` — a boolean status rendered as readable text, never the CLABE itself. */
export function formatClabeStatus(clabeVigente: boolean): string {
  return clabeVigente ? 'Vigente' : 'No vigente'
}
