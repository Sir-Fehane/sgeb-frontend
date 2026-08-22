import { useState } from 'react'

import { AuditLogContent } from '@/features/audit-log/components/AuditLogContent'
import { useAuditLogQuery } from '@/features/audit-log/queries/useAuditLogQuery'
import {
  createDefaultAuditLogFilterState,
  type AuditLogFilterState,
} from '@/features/audit-log/types/auditLog'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar la bitácora.'
}

/**
 * Routed at /bitacora — admin-only (`GET /admin/bitacora`'s
 * `middleware.rol(['admin'])`, confirmed against the pinned backend;
 * `capitán`/`mesero` are NOT authorized, unlike every other admin-console
 * screen in this branch). `canView` is a UX-only role gate sourced from the
 * real, already-authenticated OIDC session (same pattern
 * `ReportsPage`'s `canViewWaiterPerformance` already uses) — it never
 * substitutes for the backend's own authorization, which stays
 * authoritative; `useAuditLogQuery`'s `enabled: canView` means a non-admin
 * session never even fires the request.
 */
export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilterState>(() =>
    createDefaultAuditLogFilterState(),
  )
  const [page, setPage] = useState(1)

  const session = useOidcSessionStore((state) => state.session)
  const canView = session.status === 'authenticated' && session.user.rol === 'admin'

  const auditLogQuery = useAuditLogQuery(filters, page, canView)

  function handleFilterChange(nextFilters: AuditLogFilterState) {
    setFilters(nextFilters)
    setPage(1)
  }

  return (
    <AuditLogContent
      canView={canView}
      entries={auditLogQuery.data?.items ?? []}
      isLoading={canView && auditLogQuery.isPending}
      {...(auditLogQuery.isError
        ? { errorMessage: toSafeErrorMessage(auditLogQuery.error) }
        : {})}
      onRetry={() => {
        void auditLogQuery.refetch()
      }}
      filters={filters}
      onFilterChange={handleFilterChange}
      page={page}
      lastPage={auditLogQuery.data?.meta.lastPage ?? 1}
      total={auditLogQuery.data?.meta.total ?? 0}
      onPageChange={setPage}
    />
  )
}
