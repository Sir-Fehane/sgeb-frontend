import { TeamSelectionCandidateRow } from '@/features/events/team-selection/components/TeamSelectionCandidateRow'
import type {
  SelectParticipantRequest,
  TeamSelectionParticipantViewModel,
  TeamSelectionRowStatus,
} from '@/features/events/team-selection/types/teamSelection'
import { Text } from '@/shared/components'

export interface TeamSelectionCandidateListProps {
  candidates: readonly TeamSelectionParticipantViewModel[]
  rowStatuses: Readonly<Record<number, TeamSelectionRowStatus>>
  onSelect: (request: SelectParticipantRequest) => void
}

export function TeamSelectionCandidateList({
  candidates,
  rowStatuses,
  onSelect,
}: TeamSelectionCandidateListProps) {
  if (candidates.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        No hay meseros apartados para este evento.
      </Text>
    )
  }

  return (
    <ul aria-label="Candidatos apartados" className="flex flex-col gap-3">
      {candidates.map((participant) => (
        <TeamSelectionCandidateRow
          key={participant.idParticipacion}
          participant={participant}
          rowStatus={rowStatuses[participant.idParticipacion] ?? 'idle'}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
