import { useQuery } from '@tanstack/react-query'

import { auditLogQueryKeys } from '@/features/audit-log/queries/auditLogQueryKeys'
import {
  fetchAuditLog,
  toAuditLogListParams,
} from '@/features/audit-log/services/auditLogApi'
import type { AuditLogFilterState } from '@/features/audit-log/types/auditLog'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2
const PAGE_SIZE = 20

/**
 * Live `GET /admin/bitacora` query. `enabled` is the caller's UX-only
 * admin-role gate (`AuditLogPage`, same pattern `ReportsPage`'s
 * `canViewWaiterPerformance` already uses) — the backend's own
 * `middleware.rol(['admin'])` remains the real authorization boundary
 * regardless of what this flag does.
 */
export function useAuditLogQuery(
  filters: AuditLogFilterState,
  page: number,
  enabled: boolean,
) {
  const params = toAuditLogListParams(filters, page, PAGE_SIZE)

  return useQuery({
    queryKey: auditLogQueryKeys.list(params),
    queryFn: ({ signal }) => fetchAuditLog(params, signal),
    enabled,
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
