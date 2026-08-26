import type { ChecklistTemplateViewModel } from '@/features/checklists/types/checklists'
import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { LiveOperationsErrorState } from '@/features/events/live-operations/components/LiveOperationsErrorState'
import { LiveOperationsHeader } from '@/features/events/live-operations/components/LiveOperationsHeader'
import { LiveOperationsLoadingState } from '@/features/events/live-operations/components/LiveOperationsLoadingState'
import { LiveOperationsParticipantList } from '@/features/events/live-operations/components/LiveOperationsParticipantList'
import type {
  ApproveClosureChecklistRequest,
  ClosureChecklistApprovalStatus,
  ClosureChecklistInstantiationStatus,
  InstantiateClosureChecklistRequest,
  LiveOperationsParticipantViewModel,
  LiveOperationsRowStatus,
  MarkParticipantSalidaRequest,
} from '@/features/events/live-operations/types/liveOperations'

export interface LiveOperationsContentProps {
  /** `null` means "not found" — a malformed route id or an unknown event. Reuses `EventDetailUnavailableState`, same as `TeamSelectionContent`. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  participants: readonly LiveOperationsParticipantViewModel[]
  rowStatuses: Readonly<Record<number, LiveOperationsRowStatus>>
  rowErrorMessages?: Readonly<Record<number, string>>
  onMarkSalida: (request: MarkParticipantSalidaRequest) => void
  closureChecklistApprovalStatuses?: Readonly<
    Record<number, ClosureChecklistApprovalStatus>
  >
  closureChecklistApproveErrorMessages?: Readonly<Record<number, string>>
  onApproveClosureChecklist: (request: ApproveClosureChecklistRequest) => void
  availableClosureChecklistTemplates?: readonly ChecklistTemplateViewModel[]
  closureChecklistInstantiationStatuses?: Readonly<
    Record<number, ClosureChecklistInstantiationStatus>
  >
  closureChecklistInstantiateErrorMessages?: Readonly<Record<number, string>>
  onInstantiateClosureChecklist?: (request: InstantiateClosureChecklistRequest) => void
}

/**
 * The reusable presentational composition — header + one participant
 * section, or exactly one of loading / error / unavailable, selected
 * purely from props. Mirrors `TeamSelectionContent`'s architecture
 * (`EventLiveOperationsPage` is the thin, live-query wiring layer around
 * it). Deliberately a single flat roster (not split into sub-sections like
 * Team Selection's candidates/selected) — this screen's whole point is
 * showing every participant's real, distinct operational state in one
 * place, not grouping them into a smaller set of buckets.
 */
export function LiveOperationsContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  participants,
  rowStatuses,
  rowErrorMessages,
  onMarkSalida,
  closureChecklistApprovalStatuses,
  closureChecklistApproveErrorMessages,
  onApproveClosureChecklist,
  availableClosureChecklistTemplates,
  closureChecklistInstantiationStatuses,
  closureChecklistInstantiateErrorMessages,
  onInstantiateClosureChecklist,
}: LiveOperationsContentProps) {
  if (isLoading) {
    return <LiveOperationsLoadingState />
  }

  if (errorMessage) {
    return <LiveOperationsErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento) {
    return <EventDetailUnavailableState />
  }

  return (
    <div className="flex flex-col gap-6">
      <LiveOperationsHeader idEvento={evento.idEvento} tituloEvento={evento.titulo} />

      <EventDetailSection title="Participantes">
        <LiveOperationsParticipantList
          participants={participants}
          rowStatuses={rowStatuses}
          {...(rowErrorMessages ? { rowErrorMessages } : {})}
          onMarkSalida={onMarkSalida}
          {...(closureChecklistApprovalStatuses
            ? { closureChecklistApprovalStatuses }
            : {})}
          {...(closureChecklistApproveErrorMessages
            ? { closureChecklistApproveErrorMessages }
            : {})}
          onApproveClosureChecklist={onApproveClosureChecklist}
          {...(availableClosureChecklistTemplates
            ? { availableClosureChecklistTemplates }
            : {})}
          {...(closureChecklistInstantiationStatuses
            ? { closureChecklistInstantiationStatuses }
            : {})}
          {...(closureChecklistInstantiateErrorMessages
            ? { closureChecklistInstantiateErrorMessages }
            : {})}
          {...(onInstantiateClosureChecklist ? { onInstantiateClosureChecklist } : {})}
        />
      </EventDetailSection>
    </div>
  )
}
