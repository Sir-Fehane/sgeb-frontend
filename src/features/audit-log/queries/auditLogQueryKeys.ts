import type { AuditLogListParams } from '@/features/audit-log/services/auditLogApi'

export const auditLogQueryKeys = {
  all: ['bitacora'] as const,
  lists: () => [...auditLogQueryKeys.all, 'lista'] as const,
  list: (params: AuditLogListParams) => [...auditLogQueryKeys.lists(), params] as const,
}
