import { Badge } from '@/shared/components'
import type { UserAccountStatus } from '@/features/users/types/user'
import {
  USER_ACCOUNT_STATUS_LABELS,
  USER_ACCOUNT_STATUS_TONES,
} from '@/features/users/utils/userPresentation'

export interface UserStatusBadgeProps {
  estadoCuenta: UserAccountStatus
}

/** Renders `Usuario.activo` as its Spanish label — tone is secondary reinforcement, status is never color-only. */
export function UserStatusBadge({ estadoCuenta }: UserStatusBadgeProps) {
  return (
    <Badge tone={USER_ACCOUNT_STATUS_TONES[estadoCuenta]}>
      {USER_ACCOUNT_STATUS_LABELS[estadoCuenta]}
    </Badge>
  )
}
