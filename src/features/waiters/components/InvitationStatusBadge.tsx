import { Badge } from '@/shared/components'
import type { InvitationStatus } from '@/features/waiters/types/invitation'
import {
  INVITATION_STATUS_LABELS,
  INVITATION_STATUS_TONES,
} from '@/features/waiters/utils/invitationStatusPresentation'

export interface InvitationStatusBadgeProps {
  estado: InvitationStatus
}

export function InvitationStatusBadge({ estado }: InvitationStatusBadgeProps) {
  return (
    <Badge tone={INVITATION_STATUS_TONES[estado]}>
      {INVITATION_STATUS_LABELS[estado]}
    </Badge>
  )
}
