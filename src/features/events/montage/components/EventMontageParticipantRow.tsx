import { EventMontageAssignmentSection } from '@/features/events/montage/components/EventMontageAssignmentSection'
import { EventMontageChecklistSection } from '@/features/events/montage/components/EventMontageChecklistSection'
import type { ChecklistTemplateViewModel } from '@/features/events/montage/services/montageApi'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  EventTableViewModel,
  InstantiateChecklistRequest,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { Badge } from '@/shared/components'

export interface EventMontageParticipantRowProps {
  participant: MontageParticipantViewModel
  freeTables: readonly EventTableViewModel[]
  isApprovingChecklist?: boolean
  approveChecklistErrorMessage?: string
  isAssigning?: boolean
  assignErrorMessage?: string
  isReleasing?: boolean
  releaseErrorMessage?: string
  onApproveChecklist: (request: ApproveChecklistRequest) => void
  onAssignTable: (request: AssignTableRequest) => void
  onReleaseAssignment: (request: ReleaseAssignmentRequest) => void
  availableChecklistTemplates?: readonly ChecklistTemplateViewModel[]
  isInstantiatingChecklist?: boolean
  instantiateChecklistErrorMessage?: string
  onInstantiateChecklist?: (request: InstantiateChecklistRequest) => void
}

const PUESTO_LABELS: Record<MontageParticipantViewModel['puesto'], string> = {
  mesero: 'Mesero',
  barra: 'Barra',
}

/**
 * Both `mesero` and `barra` participants render identically here — the
 * assignment endpoint's summary text ("Asignar mesa a un mesero") is
 * suggestive but not a documented validation rule, so this screen does not
 * invent a puesto-based eligibility block (see the branch report's
 * contract-gap note).
 */
export function EventMontageParticipantRow({
  participant,
  freeTables,
  isApprovingChecklist,
  approveChecklistErrorMessage,
  isAssigning,
  assignErrorMessage,
  isReleasing,
  releaseErrorMessage,
  onApproveChecklist,
  onAssignTable,
  onReleaseAssignment,
  availableChecklistTemplates,
  isInstantiatingChecklist,
  instantiateChecklistErrorMessage,
  onInstantiateChecklist,
}: EventMontageParticipantRowProps) {
  return (
    <li className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-sans text-body-sm font-semibold">{participant.nombre}</span>
        <Badge tone="neutral">{PUESTO_LABELS[participant.puesto]}</Badge>
      </div>

      <EventMontageChecklistSection
        idParticipacion={participant.idParticipacion}
        nombreParticipante={participant.nombre}
        checklist={participant.checklist}
        isApproving={isApprovingChecklist ?? false}
        {...(approveChecklistErrorMessage
          ? { approveErrorMessage: approveChecklistErrorMessage }
          : {})}
        onApproveChecklist={onApproveChecklist}
        {...(availableChecklistTemplates
          ? { availableTemplates: availableChecklistTemplates }
          : {})}
        isInstantiating={isInstantiatingChecklist ?? false}
        {...(instantiateChecklistErrorMessage
          ? { instantiateErrorMessage: instantiateChecklistErrorMessage }
          : {})}
        {...(onInstantiateChecklist ? { onInstantiateChecklist } : {})}
      />

      <EventMontageAssignmentSection
        idParticipacion={participant.idParticipacion}
        nombreParticipante={participant.nombre}
        estado={participant.estado}
        checklistStatus={participant.checklist?.status}
        {...(participant.currentAssignment
          ? { currentAssignment: participant.currentAssignment }
          : {})}
        freeTables={freeTables}
        isAssigning={isAssigning ?? false}
        {...(assignErrorMessage ? { assignErrorMessage } : {})}
        isReleasing={isReleasing ?? false}
        {...(releaseErrorMessage ? { releaseErrorMessage } : {})}
        onAssignTable={onAssignTable}
        onReleaseAssignment={onReleaseAssignment}
      />
    </li>
  )
}
