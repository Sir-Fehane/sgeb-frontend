/**
 * Isolated, display-only formatting for the event operational dashboard —
 * each feature owns its own tiny formatter rather than sharing one across
 * features, same precedent `features/events/closure/utils/closureFormatting.ts`
 * already established.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function formatEventDashboardCurrency(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/** `servicio.promedioCalificacion` — one decimal, out of 5. Never called when the value is `null` (see `EventDashboardServicioSection`). */
export function formatEventDashboardRating(promedio: number): string {
  return `${promedio.toFixed(1)} / 5`
}

const ALERT_TIPO_LABELS: Record<string, string> = {
  botella_vacia: 'Botella vacía',
  botella_baja: 'Botella baja',
  cubaitor_sin_conexion: 'Cubaitor sin conexión',
}

export function formatEventDashboardAlertTipo(tipo: string): string {
  return ALERT_TIPO_LABELS[tipo] ?? tipo
}
