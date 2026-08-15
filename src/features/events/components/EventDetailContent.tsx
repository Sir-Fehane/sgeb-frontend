import {
  EventDetailComandaSection,
  type EventDetailComandaSectionProps,
} from '@/features/events/components/EventDetailComandaSection'
import { EventDetailErrorState } from '@/features/events/components/EventDetailErrorState'
import { EventDetailHeader } from '@/features/events/components/EventDetailHeader'
import { EventDetailLoadingState } from '@/features/events/components/EventDetailLoadingState'
import { EventDetailLogisticsSection } from '@/features/events/components/EventDetailLogisticsSection'
import { EventDetailRoadmapSection } from '@/features/events/components/EventDetailRoadmapSection'
import { EventDetailScheduleSection } from '@/features/events/components/EventDetailScheduleSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import type { EventDetailViewModel } from '@/features/events/types/event'

export interface EventDetailContentProps {
  /** `null` means "not found" — a fixture-lookup miss or a malformed route id, not a loading gap. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  comanda: EventDetailComandaSectionProps
}

/**
 * The reusable presentational composition — header + schedule + logistics
 * + comanda + operation roadmap, or exactly one of loading / error /
 * unavailable, selected purely from props. Mirrors `EventsContent`'s
 * architecture (`EventsPage` is the thin fixture-backed wiring layer
 * around it; `EventDetailPage` plays that same role here).
 *
 * `comanda` is passed as one bundled prop object, not flattened —
 * `EventDetailComandaSectionProps` is entirely that one section's own
 * self-contained state/actions (metadata, loading/error, canManage,
 * open/upload/retire callbacks), so it is forwarded to
 * `EventDetailComandaSection` unchanged rather than re-declared as eight
 * more individual props on this component.
 */
export function EventDetailContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  comanda,
}: EventDetailContentProps) {
  if (isLoading) {
    return <EventDetailLoadingState />
  }

  if (errorMessage) {
    return <EventDetailErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento) {
    return <EventDetailUnavailableState />
  }

  return (
    <div className="flex flex-col gap-6">
      <EventDetailHeader evento={evento} />
      <EventDetailScheduleSection evento={evento} />
      <EventDetailLogisticsSection evento={evento} />
      <EventDetailComandaSection {...comanda} />
      <EventDetailRoadmapSection idEvento={evento.idEvento} />
    </div>
  )
}
