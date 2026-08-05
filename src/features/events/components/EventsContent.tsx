import { EventList } from '@/features/events/components/EventList'
import { EventsEmptyState } from '@/features/events/components/EventsEmptyState'
import { EventsErrorState } from '@/features/events/components/EventsErrorState'
import { EventsFilters } from '@/features/events/components/EventsFilters'
import { EventsLoadingState } from '@/features/events/components/EventsLoadingState'
import { EventsPageHeader } from '@/features/events/components/EventsPageHeader'
import type {
  EventListItemViewModel,
  EventSalonOption,
  EventsFilterState,
} from '@/features/events/types/event'

export interface EventsContentProps {
  events: readonly EventListItemViewModel[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filters: EventsFilterState
  onFilterChange: (filters: EventsFilterState) => void
  /** Salón options for the filter's `id_salon` picker — dev fixtures on this branch. */
  salones: readonly EventSalonOption[]
  onSelectEvent?: (id: string) => void
  onCreate?: () => void
}

/**
 * The presentational events-page composition: header + filters +
 * exactly one of the four states (loading / error / empty / populated
 * list), selected purely from props. This is the reusable piece that
 * makes all four states reachable — `EventsPage` is just a thin,
 * fixture-backed wiring layer around it (`isLoading={false}`, no
 * `errorMessage`, real API integration will supply these props later
 * without needing to change this component).
 */
export function EventsContent({
  events,
  isLoading = false,
  errorMessage,
  onRetry,
  filters,
  onFilterChange,
  salones,
  onSelectEvent,
  onCreate,
}: EventsContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <EventsPageHeader onCreate={onCreate} />
      <EventsFilters
        filters={filters}
        onFilterChange={onFilterChange}
        salones={salones}
      />

      {isLoading ? (
        <EventsLoadingState />
      ) : errorMessage ? (
        <EventsErrorState errorMessage={errorMessage} onRetry={onRetry} />
      ) : events.length === 0 ? (
        <EventsEmptyState onCreate={onCreate} />
      ) : (
        <EventList eventos={events} onSelectEvent={onSelectEvent} />
      )}
    </div>
  )
}
