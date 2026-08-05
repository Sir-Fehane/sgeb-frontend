import { DashboardSection } from '@/features/dashboard/components/DashboardSection'
import { DashboardSectionUnavailable } from '@/features/dashboard/components/DashboardSectionUnavailable'
import { OperationalAlertItem } from '@/features/dashboard/components/OperationalAlertItem'
import type { OperationalAlertViewModel } from '@/features/dashboard/types/dashboard'
import { Text } from '@/shared/components'

export interface OperationalAlertsSectionProps {
  alertas: readonly OperationalAlertViewModel[] | null
}

/**
 * `DashboardCapitan.alertas` — `null` when unavailable, `[]` when there
 * simply are no open/relevant alerts (a valid "Sin alertas" state, not
 * an error), or a populated list.
 */
export function OperationalAlertsSection({ alertas }: OperationalAlertsSectionProps) {
  return (
    <DashboardSection title="Alertas operativas">
      {alertas === null ? (
        <DashboardSectionUnavailable />
      ) : alertas.length === 0 ? (
        <Text size="sm" className="text-muted-foreground">
          Sin alertas.
        </Text>
      ) : (
        <ul aria-label="Alertas operativas" className="flex flex-col gap-3">
          {alertas.map((alert) => (
            <OperationalAlertItem key={alert.idAlerta} alert={alert} />
          ))}
        </ul>
      )}
    </DashboardSection>
  )
}
