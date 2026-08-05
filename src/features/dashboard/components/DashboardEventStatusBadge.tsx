import { Badge } from '@/shared/components'
import type { DashboardEventStatus } from '@/features/dashboard/types/dashboard'
import {
  DASHBOARD_EVENT_STATUS_LABELS,
  DASHBOARD_EVENT_STATUS_TONES,
} from '@/features/dashboard/utils/dashboardEventStatusPresentation'

export interface DashboardEventStatusBadgeProps {
  estado: DashboardEventStatus
}

/** Renders `estado` as its Spanish label; tone is a secondary reinforcement only. */
export function DashboardEventStatusBadge({ estado }: DashboardEventStatusBadgeProps) {
  return (
    <Badge tone={DASHBOARD_EVENT_STATUS_TONES[estado]}>
      {DASHBOARD_EVENT_STATUS_LABELS[estado]}
    </Badge>
  )
}
