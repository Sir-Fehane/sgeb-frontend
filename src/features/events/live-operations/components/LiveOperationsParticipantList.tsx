import { LiveOperationsParticipantRow } from '@/features/events/live-operations/components/LiveOperationsParticipantRow'
import type {
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
}

export function LiveOperationsParticipantList({
  participants,
  rowStatuses,
  rowErrorMessages,
  onMarkSalida,
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
        return (
          <LiveOperationsParticipantRow
            key={participant.idParticipacion}
            participant={participant}
            rowStatus={rowStatuses[participant.idParticipacion] ?? 'idle'}
            {...(errorMessage ? { errorMessage } : {})}
            onMarkSalida={onMarkSalida}
          />
        )
      })}
    </ul>
  )
}
