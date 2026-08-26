import { IconLogout } from '@tabler/icons-react'

import type { ChecklistTemplateViewModel } from '@/features/checklists/types/checklists'
import { LiveOperationsClosureChecklistSection } from '@/features/events/live-operations/components/LiveOperationsClosureChecklistSection'
import type {
  ApproveClosureChecklistRequest,
  ClosureChecklistApprovalStatus,
  ClosureChecklistInstantiationStatus,
  InstantiateClosureChecklistRequest,
  LiveOperationsParticipantViewModel,
  LiveOperationsRowStatus,
  MarkParticipantSalidaRequest,
} from '@/features/events/live-operations/types/liveOperations'
import {
  getSalidaBlockReason,
  isClosureChecklistApprovedForSalida,
  isEligibleForSalida,
  PARTICIPATION_STATE_LABELS,
  PARTICIPATION_STATE_TONES,
  PUESTO_LABELS,
} from '@/features/events/live-operations/utils/liveOperationsPresentation'
import { Badge, Button, Text } from '@/shared/components'

export interface LiveOperationsParticipantRowProps {
  participant: LiveOperationsParticipantViewModel
  rowStatus: LiveOperationsRowStatus
  /** Safe, backend-approved `SgebApplicationError`/`SgebNetworkError` message. Never a `technical_message`. */
  errorMessage?: string
  onMarkSalida: (request: MarkParticipantSalidaRequest) => void
  closureChecklistApprovalStatus?: ClosureChecklistApprovalStatus
  closureChecklistApproveErrorMessage?: string
  onApproveClosureChecklist: (request: ApproveClosureChecklistRequest) => void
  availableClosureChecklistTemplates?: readonly ChecklistTemplateViewModel[]
  closureChecklistInstantiationStatus?: ClosureChecklistInstantiationStatus
  closureChecklistInstantiateErrorMessage?: string
  onInstantiateClosureChecklist?: (request: InstantiateClosureChecklistRequest) => void
}

/**
 * One participant row. Only a `vinculo` participant ever renders the "Dar
 * salida" action (`isEligibleForSalida` — matching the pinned backend's
 * `TRANSICIONES` map exactly); every other state — including `salida`
 * itself, which is terminal — renders a plain "—", never a
 * disabled/greyed-out button. A disabled control would still suggest the
 * action might become available later by itself; it doesn't — only the
 * backend's own forward progression (Team Selection/Attendance/Montage)
 * moves a participant into `vinculo`.
 *
 * A `vinculo` participant DOES now render as a disabled button when the
 * exit checklist isn't ready (`getSalidaBlockReason` non-`undefined`) —
 * unlike the state-machine case above, this condition genuinely can become
 * satisfied without leaving the row (assigning/completing/approving the
 * checklist, all live on this same screen), so a disabled control with an
 * explanation is the honest affordance here, not a missing one. Mirrors
 * the pinned backend's own `SGEB-4027` guard
 * (`verificarChecklistCierre`) — this is real, backend-enforced gating now,
 * not an advisory hint the button ignores.
 */
export function LiveOperationsParticipantRow({
  participant,
  rowStatus,
  errorMessage,
  onMarkSalida,
  closureChecklistApprovalStatus,
  closureChecklistApproveErrorMessage,
  onApproveClosureChecklist,
  availableClosureChecklistTemplates,
  closureChecklistInstantiationStatus,
  closureChecklistInstantiateErrorMessage,
  onInstantiateClosureChecklist,
}: LiveOperationsParticipantRowProps) {
  const stateEligible = isEligibleForSalida(participant.estado)
  const blockReason = stateEligible
    ? getSalidaBlockReason(participant.closureChecklist)
    : undefined
  const canMarkSalida =
    stateEligible && isClosureChecklistApprovedForSalida(participant.closureChecklist)

  return (
    <li className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-sans text-body-sm font-semibold">
            {participant.nombre}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{PUESTO_LABELS[participant.puesto]}</Badge>
            <Badge tone={PARTICIPATION_STATE_TONES[participant.estado]}>
              {PARTICIPATION_STATE_LABELS[participant.estado]}
            </Badge>
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          {stateEligible ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={<IconLogout aria-hidden="true" />}
              loading={rowStatus === 'marking'}
              disabled={!canMarkSalida}
              aria-label={`Dar salida a ${participant.nombre}`}
              onClick={() => {
                onMarkSalida({ idParticipacion: participant.idParticipacion })
              }}
            >
              Dar salida
            </Button>
          ) : (
            <Text size="sm" className="text-muted-foreground" aria-hidden="true">
              —
            </Text>
          )}
          {rowStatus === 'error' ? (
            <Text size="sm" className="text-destructive">
              {errorMessage ?? 'No pudimos registrar la salida. Intenta de nuevo.'}
            </Text>
          ) : null}
          {blockReason ? (
            <Text size="sm" className="text-muted-foreground sm:text-right">
              {blockReason}
            </Text>
          ) : null}
        </div>
      </div>

      <LiveOperationsClosureChecklistSection
        idParticipacion={participant.idParticipacion}
        nombreParticipante={participant.nombre}
        checklist={participant.closureChecklist}
        {...(closureChecklistApprovalStatus
          ? { approvalStatus: closureChecklistApprovalStatus }
          : {})}
        {...(closureChecklistApproveErrorMessage
          ? { approveErrorMessage: closureChecklistApproveErrorMessage }
          : {})}
        onApproveChecklist={onApproveClosureChecklist}
        {...(availableClosureChecklistTemplates
          ? { availableTemplates: availableClosureChecklistTemplates }
          : {})}
        {...(closureChecklistInstantiationStatus
          ? { isInstantiating: closureChecklistInstantiationStatus === 'instantiating' }
          : {})}
        {...(closureChecklistInstantiateErrorMessage
          ? { instantiateErrorMessage: closureChecklistInstantiateErrorMessage }
          : {})}
        {...(onInstantiateClosureChecklist
          ? { onInstantiateChecklist: onInstantiateClosureChecklist }
          : {})}
      />
    </li>
  )
}
