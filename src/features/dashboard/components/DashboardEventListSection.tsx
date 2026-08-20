import { DashboardEventRow } from '@/features/dashboard/components/DashboardEventRow'
import { DashboardSection } from '@/features/dashboard/components/DashboardSection'
import type { DashboardEventViewModel } from '@/features/dashboard/types/dashboard'
import { Text } from '@/shared/components'

export interface DashboardEventListSectionProps {
  title: string
  events: readonly DashboardEventViewModel[]
  emptyMessage: string
}

/**
 * Generic list section shared by the three real event lists
 * `GET /dashboard/capitan` returns (`en_curso`, `proximos`, `por_cerrar`).
 * Unlike the old fixture-era `UpcomingEventsSection`, no section here is
 * ever `null` — the real endpoint has no partial-success semantics (see
 * `types/dashboard.ts`) — so an empty list always means "genuinely zero
 * events," rendered with `emptyMessage`, never an "unavailable" state.
 */
export function DashboardEventListSection({
  title,
  events,
  emptyMessage,
}: DashboardEventListSectionProps) {
  return (
    <DashboardSection title={title}>
      {events.length === 0 ? (
        <Text size="sm" className="text-muted-foreground">
          {emptyMessage}
        </Text>
      ) : (
        <ul aria-label={title} className="flex flex-col gap-3">
          {events.map((event) => (
            <DashboardEventRow key={event.idEvento} event={event} />
          ))}
        </ul>
      )}
    </DashboardSection>
  )
}
