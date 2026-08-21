import { IconAlertTriangle } from '@tabler/icons-react'

import type { AlertaViewModel } from '@/features/events/cubaitor/types/eventCubaitor'
import { Alert, Text } from '@/shared/components'

function alertaMensaje(alerta: AlertaViewModel): string {
  switch (alerta.tipo) {
    case 'botella_vacia':
      return `${alerta.insumo ?? `Insumo ${String(alerta.idInsumo)}`} agotado en el pin ${String(alerta.pinGpio)} — las órdenes que lo necesitan están pausadas.`
    case 'botella_baja':
      return `${alerta.insumo ?? `Insumo ${String(alerta.idInsumo)}`} al ${String(alerta.porcentaje)}% en el pin ${String(alerta.pinGpio)} — cambia la botella pronto.`
    case 'cubaitor_sin_conexion':
      return `${alerta.nombre}: sin reporte de conexión. ${alerta.nota}`
  }
}

/**
 * Inline operational warning for the bar screen — server-truth alerts
 * (`GET /eventos/{id}/alertas`, derived live, no persisted "resolved"
 * state — see `types/eventCubaitor.ts`). Complements, never duplicates,
 * `NotificationBell`'s ephemeral `alerta:insumo` toast (task §13): this
 * banner is the durable, always-current view for whoever has this screen
 * open, sourced from REST rather than a transient socket push that may have
 * fired before this screen was mounted.
 */
export function EventCubaitorAlertasBanner({
  alertas,
}: {
  alertas: readonly AlertaViewModel[]
}) {
  if (alertas.length === 0) {
    return null
  }

  const tieneAltas = alertas.some((a) => a.severidad === 'alta')

  return (
    <Alert
      tone={tieneAltas ? 'danger' : 'warning'}
      icon={<IconAlertTriangle />}
      title={`${String(alertas.length)} ${alertas.length === 1 ? 'alerta activa' : 'alertas activas'}`}
    >
      <ul className="flex flex-col gap-1">
        {alertas.map((alerta, index) => (
          <li key={index}>
            <Text size="sm">{alertaMensaje(alerta)}</Text>
          </li>
        ))}
      </ul>
    </Alert>
  )
}
