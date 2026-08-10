import { EventMontageAssignmentSection } from '@/features/events/montage/components/EventMontageAssignmentSection'
import { EventMontageChecklistSection } from '@/features/events/montage/components/EventMontageChecklistSection'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  EventTableViewModel,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { Badge } from '@/shared/components'

export interface EventMontageParticipantRowProps {
  participant: MontageParticipantViewModel
  freeTables: readonly EventTableViewModel[]
  onApproveChecklist: (request: ApproveChecklistRequest) => void
  onAssignTable: (request: AssignTableRequest) => void
  onReleaseAssignment: (request: ReleaseAssignmentRequest) => void
}

const PUESTO_LABELS: Record<MontageParticipantViewModel['puesto'], string> = {
  mesero: 'Mesero',
  barra: 'Barra',
}

/**
 * Both `mesero` and `barra` participants render identically here — the
 * assignment endpoint's summary text ("Asignar mesa a un mesero") is
 * suggestive but not a documented validation rule, so this foundation
 * does not invent a puesto-based eligibility block (see the README's
 * contract-gap note).
 */
export function EventMontageParticipantRow({
  participant,
  freeTables,
  onApproveChecklist,
  onAssignTable,
  onReleaseAssignment,
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
        onApproveChecklist={onApproveChecklist}
      />

      <EventMontageAssignmentSection
        idParticipacion={participant.idParticipacion}
        nombreParticipante={participant.nombre}
        checklistStatus={participant.checklist?.status}
        assignedTables={participant.assignedTables}
        freeTables={freeTables}
        onAssignTable={onAssignTable}
        onReleaseAssignment={onReleaseAssignment}
      />
    </li>
  )
}
