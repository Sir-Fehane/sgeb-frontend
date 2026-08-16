import { IconLogout } from '@tabler/icons-react'

import type {
  LiveOperationsParticipantViewModel,
  LiveOperationsRowStatus,
  MarkParticipantSalidaRequest,
} from '@/features/events/live-operations/types/liveOperations'
import {
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
}

/**
 * One participant row. Only a `vinculo` participant ever renders the "Dar
 * salida" action (`isEligibleForSalida` — the single source of truth,
 * matching the pinned backend's `TRANSICIONES` map exactly); every other
 * state — including `salida` itself, which is terminal — renders a plain
 * "—", never a disabled/greyed-out button. A disabled control would still
 * suggest the action might become available later by itself; it doesn't —
 * only the backend's own forward progression (Team Selection/Attendance/
 * Montage) moves a participant into `vinculo`.
 */
export function LiveOperationsParticipantRow({
  participant,
  rowStatus,
  errorMessage,
  onMarkSalida,
}: LiveOperationsParticipantRowProps) {
  const eligible = isEligibleForSalida(participant.estado)

  return (
    <li className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-body-sm font-semibold">{participant.nombre}</span>
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{PUESTO_LABELS[participant.puesto]}</Badge>
          <Badge tone={PARTICIPATION_STATE_TONES[participant.estado]}>
            {PARTICIPATION_STATE_LABELS[participant.estado]}
          </Badge>
        </span>
      </div>

      <div className="flex flex-col items-start gap-1 sm:items-end">
        {eligible ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon={<IconLogout aria-hidden="true" />}
            loading={rowStatus === 'marking'}
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
      </div>
    </li>
  )
}
