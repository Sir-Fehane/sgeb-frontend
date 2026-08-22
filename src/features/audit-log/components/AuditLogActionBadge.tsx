import { Badge } from '@/shared/components'
import type { AuditLogAction } from '@/features/audit-log/types/auditLog'
import {
  AUDIT_LOG_ACTION_LABELS,
  AUDIT_LOG_ACTION_TONES,
} from '@/features/audit-log/utils/auditLogPresentation'

export interface AuditLogActionBadgeProps {
  accion: AuditLogAction
}

export function AuditLogActionBadge({ accion }: AuditLogActionBadgeProps) {
  return (
    <Badge tone={AUDIT_LOG_ACTION_TONES[accion]}>{AUDIT_LOG_ACTION_LABELS[accion]}</Badge>
  )
}
