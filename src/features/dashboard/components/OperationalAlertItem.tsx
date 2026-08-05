import { Badge, Caption, Text } from '@/shared/components'
import type { OperationalAlertViewModel } from '@/features/dashboard/types/dashboard'
import {
  ALERT_SEVERITY_LABELS,
  ALERT_SEVERITY_TONES,
  ALERT_STATE_LABELS,
  ALERT_STATE_TONES,
  ALERT_TYPE_LABELS,
} from '@/features/dashboard/utils/dashboardAlertPresentation'
import { formatDashboardDateTime } from '@/features/dashboard/utils/dashboardFormatting'

export interface OperationalAlertItemProps {
  alert: OperationalAlertViewModel
}

/**
 * `AlertaOperativa.mensaje` is always the primary, user-facing text —
 * `technical_message` does not exist on this view model and must never
 * be introduced. `codigoRelacionado` (e.g. "SGEB-4009") is rendered only
 * as small, secondary, support-facing text — never as the alert's main
 * message, and never linked to any client-side code→message table. No
 * dismiss action: none is documented.
 */
export function OperationalAlertItem({ alert }: OperationalAlertItemProps) {
  const creada = formatDashboardDateTime(alert.creadaEn)

  return (
    <li className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={ALERT_SEVERITY_TONES[alert.severidad]}>
          {ALERT_SEVERITY_LABELS[alert.severidad]}
        </Badge>
        <Badge tone={ALERT_STATE_TONES[alert.estado]}>
          {ALERT_STATE_LABELS[alert.estado]}
        </Badge>
        <Caption>{ALERT_TYPE_LABELS[alert.tipo]}</Caption>
      </div>

      <Text size="sm">{alert.mensaje}</Text>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Caption>{creada}</Caption>
        {alert.codigoRelacionado ? (
          <Caption>Código de referencia: {alert.codigoRelacionado}</Caption>
        ) : null}
      </div>
    </li>
  )
}
