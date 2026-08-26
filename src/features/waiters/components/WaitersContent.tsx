import { WaiterList } from '@/features/waiters/components/WaiterList'
import { WaitersEmptyState } from '@/features/waiters/components/WaitersEmptyState'
import { WaitersErrorState } from '@/features/waiters/components/WaitersErrorState'
import { WaitersFilters } from '@/features/waiters/components/WaitersFilters'
import { WaitersForbiddenState } from '@/features/waiters/components/WaitersForbiddenState'
import { WaitersLoadingState } from '@/features/waiters/components/WaitersLoadingState'
import { WaitersPageHeader } from '@/features/waiters/components/WaitersPageHeader'
import type {
  WaiterListItemViewModel,
  WaitersFilterState,
} from '@/features/waiters/types/waiter'

export interface WaitersContentProps {
  canView: boolean
  waiters: readonly WaiterListItemViewModel[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filters: WaitersFilterState
  onFilterChange: (filters: WaitersFilterState) => void
  /** Omit to render every waiter as a non-interactive item — no waiter-detail route exists yet. */
  onSelectWaiter?: (id: string) => void
  onInvite: () => void
  isInviteDisabled?: boolean
}

/**
 * The presentational waiters-roster composition: header + filters +
 * exactly one of the four states (loading / error / empty / populated
 * list). `WaitersPage` wires `useWaitersQuery` into these props; the
 * invitations roster (`InvitationsSection`) is a deliberately separate
 * component rendered alongside this one, not nested inside it — an
 * invited person has no `Usuario` row yet, so it is never one of these
 * `waiters`. `canView` gates everything below the header behind
 * `WaitersForbiddenState` for a non-capitán/admin session reaching
 * `/meseros` directly by URL — same pattern `UsersContent`/`AuditLogContent`
 * already establish.
 */
export function WaitersContent({
  canView,
  waiters,
  isLoading = false,
  errorMessage,
  onRetry,
  filters,
  onFilterChange,
  onSelectWaiter,
  onInvite,
  isInviteDisabled = false,
}: WaitersContentProps) {
  if (!canView) {
    return (
      <div className="flex flex-col gap-6">
        <WaitersForbiddenState />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <WaitersPageHeader onInvite={onInvite} isInviteDisabled={isInviteDisabled} />
      <WaitersFilters filters={filters} onFilterChange={onFilterChange} />

      {isLoading ? (
        <WaitersLoadingState />
      ) : errorMessage ? (
        <WaitersErrorState errorMessage={errorMessage} onRetry={onRetry} />
      ) : waiters.length === 0 ? (
        <WaitersEmptyState />
      ) : (
        <WaiterList waiters={waiters} onSelectWaiter={onSelectWaiter} />
      )}
    </div>
  )
}
