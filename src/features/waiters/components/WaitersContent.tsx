import { WaiterList } from '@/features/waiters/components/WaiterList'
import { WaitersEmptyState } from '@/features/waiters/components/WaitersEmptyState'
import { WaitersErrorState } from '@/features/waiters/components/WaitersErrorState'
import { WaitersFilters } from '@/features/waiters/components/WaitersFilters'
import { WaitersLoadingState } from '@/features/waiters/components/WaitersLoadingState'
import { WaitersPageHeader } from '@/features/waiters/components/WaitersPageHeader'
import type {
  WaiterListItemViewModel,
  WaitersFilterState,
} from '@/features/waiters/types/waiter'

export interface WaitersContentProps {
  waiters: readonly WaiterListItemViewModel[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filters: WaitersFilterState
  onFilterChange: (filters: WaitersFilterState) => void
  /** Omit to render every waiter as a non-interactive item — see `WaiterListItem`. */
  onSelectWaiter?: (id: string) => void
  /** Omit to render a genuinely disabled invite button — see `WaitersPageHeader`. */
  onInvite?: () => void
}

/**
 * The presentational waiters-page composition: header + filters +
 * exactly one of the four states (loading / error / empty / populated
 * list), selected purely from props — mirrors `EventsContent`'s
 * architecture. `WaitersPage` is a thin, fixture-backed wiring layer
 * around it (`isLoading={false}`, no `errorMessage`); real API
 * integration wires TanStack Query state into those same two props
 * without needing to change this component.
 */
export function WaitersContent({
  waiters,
  isLoading = false,
  errorMessage,
  onRetry,
  filters,
  onFilterChange,
  onSelectWaiter,
  onInvite,
}: WaitersContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <WaitersPageHeader onInvite={onInvite} />
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
