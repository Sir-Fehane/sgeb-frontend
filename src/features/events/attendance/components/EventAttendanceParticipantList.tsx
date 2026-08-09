import { EventAttendanceParticipantRow } from '@/features/events/attendance/components/EventAttendanceParticipantRow'
import type { EventAttendanceParticipantViewModel } from '@/features/events/attendance/types/attendance'
import { Text } from '@/shared/components'

export interface EventAttendanceParticipantListProps {
  participants: readonly EventAttendanceParticipantViewModel[]
}

export function EventAttendanceParticipantList({
  participants,
}: EventAttendanceParticipantListProps) {
  if (participants.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        Aún no hay meseros seleccionados para este evento.
      </Text>
    )
  }

  return (
    <ul aria-label="Pase de lista" className="flex flex-col gap-3">
      {participants.map((participant) => (
        <EventAttendanceParticipantRow
          key={participant.idParticipacion}
          participant={participant}
        />
      ))}
    </ul>
  )
}
