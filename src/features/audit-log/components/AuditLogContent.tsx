import { AuditLogEmptyState } from '@/features/audit-log/components/AuditLogEmptyState'
import { AuditLogErrorState } from '@/features/audit-log/components/AuditLogErrorState'
import { AuditLogFilters } from '@/features/audit-log/components/AuditLogFilters'
import { AuditLogForbiddenState } from '@/features/audit-log/components/AuditLogForbiddenState'
import { AuditLogLoadingState } from '@/features/audit-log/components/AuditLogLoadingState'
import { AuditLogPagination } from '@/features/audit-log/components/AuditLogPagination'
import { AuditLogTable } from '@/features/audit-log/components/AuditLogTable'
import type {
  AuditLogEntryViewModel,
  AuditLogFilterState,
} from '@/features/audit-log/types/auditLog'
import { Text } from '@/shared/components'

export interface AuditLogContentProps {
  canView: boolean
  entries: readonly AuditLogEntryViewModel[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filters: AuditLogFilterState
  onFilterChange: (filters: AuditLogFilterState) => void
  page: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
}

/**
 * The presentational Bitácora composition: header copy + filters + exactly
 * one of loading/error/empty/populated states + pagination — same split
 * `UsersContent`/`WaitersContent` establish. `canView` gates everything
 * below the header behind `AuditLogForbiddenState` for a non-admin session.
 */
export function AuditLogContent({
  canView,
  entries,
  isLoading = false,
  errorMessage,
  onRetry,
  filters,
  onFilterChange,
  page,
  lastPage,
  total,
  onPageChange,
}: AuditLogContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <Text size="sm" className="text-muted-foreground">
        Consulta el historial de movimientos del sistema.
      </Text>

      {!canView ? (
        <AuditLogForbiddenState />
      ) : (
        <>
          <AuditLogFilters filters={filters} onFilterChange={onFilterChange} />

          {isLoading ? (
            <AuditLogLoadingState />
          ) : errorMessage ? (
            <AuditLogErrorState errorMessage={errorMessage} onRetry={onRetry} />
          ) : entries.length === 0 ? (
            <AuditLogEmptyState />
          ) : (
            <>
              <AuditLogTable entries={entries} />
              <AuditLogPagination
                page={page}
                lastPage={lastPage}
                total={total}
                onPageChange={onPageChange}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
