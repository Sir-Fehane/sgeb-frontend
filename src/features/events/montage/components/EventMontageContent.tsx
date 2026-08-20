import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { EventMontageErrorState } from '@/features/events/montage/components/EventMontageErrorState'
import { EventMontageHeader } from '@/features/events/montage/components/EventMontageHeader'
import { EventMontageLoadingState } from '@/features/events/montage/components/EventMontageLoadingState'
import { EventMontageParticipantList } from '@/features/events/montage/components/EventMontageParticipantList'
import { EventMontageSummary } from '@/features/events/montage/components/EventMontageSummary'
import { EventMontageTablesSection } from '@/features/events/montage/components/EventMontageTablesSection'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  ChecklistApprovalStatus,
  EventTableViewModel,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'

export interface EventMontageContentProps {
  /** `null` means "not found" — a malformed route id or a real `GET /eventos/{id}` 404, not a loading gap. Reuses `EventDetailUnavailableState`: same concern as Event Detail's own unavailable event. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  participants: readonly MontageParticipantViewModel[]
  tables: readonly EventTableViewModel[]
  /** Section-scoped: a mesas/asignaciones failure never blocks the checklist/roster half of the page — see `EventMontagePage`'s own comment. */
  tablesLoading?: boolean
  tablesErrorMessage?: string
  onRetryTables?: (() => void) | undefined
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

/**
 * The reusable presentational composition — header + summary + table
 * overview + per-mesero checklist/assignment list, or exactly one of
 * loading / error / unavailable, selected purely from props. All summary
 * counts are plain derivations of `participants`/`tables` — never a
 * second, independently-maintained source (see `EventMontageSummary`),
 * and never `DashboardEvento`.
 */
export function EventMontageContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  participants,
  tables,
  tablesLoading = false,
  tablesErrorMessage,
  onRetryTables,
  checklistApprovalStatuses,
  checklistApprovalErrorMessages,
  assignStatuses,
  assignErrorMessages,
  releaseStatuses,
  releaseErrorMessages,
  onApproveChecklist,
  onAssignTable,
  onReleaseAssignment,
}: EventMontageContentProps) {
  if (isLoading) {
    return <EventMontageLoadingState />
  }

  if (errorMessage) {
    return <EventMontageErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento) {
    return <EventDetailUnavailableState />
  }

  const checklistAprobadoTotal = participants.filter(
    (participant) => participant.checklist?.status === 'approved',
  ).length
  const mesasLibresTotal = tables.filter((mesa) => mesa.estado === 'libre').length
  const conMesaAsignadaTotal = participants.filter(
    (participant) => participant.currentAssignment !== undefined,
  ).length

  return (
    <div className="flex flex-col gap-6">
      <EventMontageHeader idEvento={evento.idEvento} tituloEvento={evento.titulo} />

      <EventMontageSummary
        participantsTotal={participants.length}
        checklistAprobadoTotal={checklistAprobadoTotal}
        mesasLibresTotal={mesasLibresTotal}
        mesasTotal={tables.length}
        conMesaAsignadaTotal={conMesaAsignadaTotal}
      />

      <EventMontageTablesSection
        tables={tables}
        isLoading={tablesLoading}
        {...(tablesErrorMessage ? { errorMessage: tablesErrorMessage } : {})}
        onRetry={onRetryTables}
        numMesasPlaneadas={evento.numMesas}
      />

      <EventDetailSection title="Meseros seleccionados">
        <EventMontageParticipantList
          participants={participants}
          tables={tables}
          checklistApprovalStatuses={checklistApprovalStatuses}
          {...(checklistApprovalErrorMessages ? { checklistApprovalErrorMessages } : {})}
          assignStatuses={assignStatuses}
          {...(assignErrorMessages ? { assignErrorMessages } : {})}
          releaseStatuses={releaseStatuses}
          {...(releaseErrorMessages ? { releaseErrorMessages } : {})}
          onApproveChecklist={onApproveChecklist}
          onAssignTable={onAssignTable}
          onReleaseAssignment={onReleaseAssignment}
        />
      </EventDetailSection>
    </div>
  )
}
