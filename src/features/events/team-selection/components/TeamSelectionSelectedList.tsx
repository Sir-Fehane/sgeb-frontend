import { TeamSelectionSelectedRow } from '@/features/events/team-selection/components/TeamSelectionSelectedRow'
import type { TeamSelectionParticipantViewModel } from '@/features/events/team-selection/types/teamSelection'
import { Text } from '@/shared/components'

export interface TeamSelectionSelectedListProps {
  selected: readonly TeamSelectionParticipantViewModel[]
}

export function TeamSelectionSelectedList({ selected }: TeamSelectionSelectedListProps) {
  if (selected.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        Aún no has seleccionado a nadie para este evento.
      </Text>
    )
  }

  return (
    <ul aria-label="Equipo seleccionado" className="flex flex-col gap-3">
      {selected.map((participant) => (
        <TeamSelectionSelectedRow
          key={participant.idParticipacion}
          participant={participant}
        />
      ))}
    </ul>
  )
}
