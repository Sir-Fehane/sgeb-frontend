import { EventMontageParticipantRow } from '@/features/events/montage/components/EventMontageParticipantRow'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  ChecklistApprovalStatus,
  EventTableViewModel,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { Text } from '@/shared/components'

export interface EventMontageParticipantListProps {
  participants: readonly MontageParticipantViewModel[]
  tables: readonly EventTableViewModel[]
  checklistApprovalStatuses: Readonly<Record<number, ChecklistApprovalStatus>>
  checklistApprovalErrorMessages?: Readonly<Record<number, string>>
  assignStatuses: Readonly<Record<number, 'assigning' | 'error'>>
  assignErrorMessages?: Readonly<Record<number, string>>
  releaseStatuses: Readonly<Record<number, 'releasing' | 'error'>>
  releaseErrorMessages?: Readonly<Record<number, string>>
  onApproveChecklist: (request: ApproveChecklistRequest) => void
  onAssignTable: (request: AssignTableRequest) => void
  onReleaseAssignment: (request: ReleaseAssignmentRequest) => void
}

export function EventMontageParticipantList({
  participants,
  tables,
  checklistApprovalStatuses,
  checklistApprovalErrorMessages,
  assignStatuses,
  assignErrorMessages,
  releaseStatuses,
  releaseErrorMessages,
  onApproveChecklist,
  onAssignTable,
  onReleaseAssignment,
}: EventMontageParticipantListProps) {
  if (participants.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        Aún no hay meseros seleccionados para este evento.
      </Text>
    )
  }

  // Excludes a table with any current assignment, even an unlinked one —
  // a UI-level safeguard, since the backend's own double-assign guard
  // (SGEB-4006) only blocks a second assign against an already-*linked*
  // mesa (see `EventMontageAssignmentSection`'s own comment).
  const freeTables = tables.filter(
    (mesa) => mesa.estado === 'libre' && mesa.currentAssignment === undefined,
  )

  return (
    <ul aria-label="Montaje y asignación por mesero" className="flex flex-col gap-3">
      {participants.map((participant) => (
        <EventMontageParticipantRow
          key={participant.idParticipacion}
          participant={participant}
          freeTables={freeTables}
          isApprovingChecklist={
            checklistApprovalStatuses[participant.idParticipacion] === 'approving'
          }
          {...(checklistApprovalErrorMessages?.[participant.idParticipacion]
            ? {
                approveChecklistErrorMessage:
                  checklistApprovalErrorMessages[participant.idParticipacion],
              }
            : {})}
          isAssigning={assignStatuses[participant.idParticipacion] === 'assigning'}
          {...(assignErrorMessages?.[participant.idParticipacion]
            ? { assignErrorMessage: assignErrorMessages[participant.idParticipacion] }
            : {})}
          isReleasing={releaseStatuses[participant.idParticipacion] === 'releasing'}
          {...(releaseErrorMessages?.[participant.idParticipacion]
            ? { releaseErrorMessage: releaseErrorMessages[participant.idParticipacion] }
            : {})}
          onApproveChecklist={onApproveChecklist}
          onAssignTable={onAssignTable}
          onReleaseAssignment={onReleaseAssignment}
        />
      ))}
    </ul>
  )
}
