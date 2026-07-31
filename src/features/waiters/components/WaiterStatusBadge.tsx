import { Badge } from '@/shared/components'
import type { WaiterAccountStatus } from '@/features/waiters/types/waiter'
import {
  WAITER_ACCOUNT_STATUS_LABELS,
  WAITER_ACCOUNT_STATUS_TONES,
} from '@/features/waiters/utils/waiterStatusPresentation'

export interface WaiterStatusBadgeProps {
  estadoCuenta: WaiterAccountStatus
}

/**
 * Renders the documented account status (`Usuario.activo`) as its
 * Spanish label. The tone is a secondary reinforcement — the text
 * label is always present, so status is never color-only.
 */
export function WaiterStatusBadge({ estadoCuenta }: WaiterStatusBadgeProps) {
  return (
    <Badge tone={WAITER_ACCOUNT_STATUS_TONES[estadoCuenta]}>
      {WAITER_ACCOUNT_STATUS_LABELS[estadoCuenta]}
    </Badge>
  )
}
