import type { ChecklistTemplateViewModel } from '@/features/checklists/types/checklists'
import { LiveOperationsParticipantRow } from '@/features/events/live-operations/components/LiveOperationsParticipantRow'
import type {
  ApproveClosureChecklistRequest,
  ClosureChecklistApprovalStatus,
  ClosureChecklistInstantiationStatus,
  InstantiateClosureChecklistRequest,
  LiveOperationsParticipantViewModel,
  LiveOperationsRowStatus,
  MarkParticipantSalidaRequest,
} from '@/features/events/live-operations/types/liveOperations'
import { Text } from '@/shared/components'

export interface LiveOperationsParticipantListProps {
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

export function LiveOperationsParticipantList({
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
}: LiveOperationsParticipantListProps) {
  if (participants.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        No hay participantes registrados para este evento.
      </Text>
    )
  }

  return (
    <ul aria-label="Participantes del evento" className="flex flex-col gap-3">
      {participants.map((participant) => {
        const errorMessage = rowErrorMessages?.[participant.idParticipacion]
        const approvalStatus =
          closureChecklistApprovalStatuses?.[participant.idParticipacion]
        const approveErrorMessage =
          closureChecklistApproveErrorMessages?.[participant.idParticipacion]
        const instantiationStatus =
          closureChecklistInstantiationStatuses?.[participant.idParticipacion]
        const instantiateErrorMessage =
          closureChecklistInstantiateErrorMessages?.[participant.idParticipacion]
        return (
          <LiveOperationsParticipantRow
            key={participant.idParticipacion}
            participant={participant}
            rowStatus={rowStatuses[participant.idParticipacion] ?? 'idle'}
            {...(errorMessage ? { errorMessage } : {})}
            onMarkSalida={onMarkSalida}
            {...(approvalStatus
              ? { closureChecklistApprovalStatus: approvalStatus }
              : {})}
            {...(approveErrorMessage
              ? { closureChecklistApproveErrorMessage: approveErrorMessage }
              : {})}
            onApproveClosureChecklist={onApproveClosureChecklist}
            {...(availableClosureChecklistTemplates
              ? { availableClosureChecklistTemplates }
              : {})}
            {...(instantiationStatus
              ? { closureChecklistInstantiationStatus: instantiationStatus }
              : {})}
            {...(instantiateErrorMessage
              ? { closureChecklistInstantiateErrorMessage: instantiateErrorMessage }
              : {})}
            {...(onInstantiateClosureChecklist ? { onInstantiateClosureChecklist } : {})}
          />
        )
      })}
    </ul>
  )
}
