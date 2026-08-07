import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { TeamSelectionCandidateList } from '@/features/events/team-selection/components/TeamSelectionCandidateList'
import { TeamSelectionErrorState } from '@/features/events/team-selection/components/TeamSelectionErrorState'
import { TeamSelectionHeader } from '@/features/events/team-selection/components/TeamSelectionHeader'
import { TeamSelectionLoadingState } from '@/features/events/team-selection/components/TeamSelectionLoadingState'
import { TeamSelectionSelectedList } from '@/features/events/team-selection/components/TeamSelectionSelectedList'
import { TeamSelectionSummary } from '@/features/events/team-selection/components/TeamSelectionSummary'
import type {
  SelectParticipantRequest,
  TeamSelectionParticipantViewModel,
  TeamSelectionRowStatus,
} from '@/features/events/team-selection/types/teamSelection'

export interface TeamSelectionContentProps {
  /** `null` means "not found" — a fixture-lookup miss or a malformed route id, not a loading gap. Reuses `EventDetailUnavailableState`: same concern as Event Detail's own unavailable event. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  participants: readonly TeamSelectionParticipantViewModel[]
  rowStatuses: Readonly<Record<number, TeamSelectionRowStatus>>
  onSelectParticipant: (request: SelectParticipantRequest) => void
}

/**
 * The reusable presentational composition — header + summary + candidate
 * section + selected section, or exactly one of loading / error /
 * unavailable, selected purely from props. Mirrors `EventDetailContent`'s
 * architecture (`TeamSelectionPage` is the thin, fixture-backed wiring
 * layer around it). Candidates/selected are derived from `participants`'
 * live `estado` — a participant moves from one list to the other purely
 * by its `estado` changing, never by a separate "removed" action.
 */
export function TeamSelectionContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  participants,
  rowStatuses,
  onSelectParticipant,
}: TeamSelectionContentProps) {
  if (isLoading) {
    return <TeamSelectionLoadingState />
  }

  if (errorMessage) {
    return <TeamSelectionErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento) {
    return <EventDetailUnavailableState />
  }

  const candidates = participants.filter((participant) => participant.estado === 'aparto')
  const selected = participants.filter(
    (participant) => participant.estado === 'seleccionado',
  )

  return (
    <div className="flex flex-col gap-6">
      <TeamSelectionHeader idEvento={evento.idEvento} tituloEvento={evento.titulo} />

      <TeamSelectionSummary
        cupoMeseros={evento.cupoMeseros}
        numSeleccionados={selected.length}
        numApartos={candidates.length}
      />

      <EventDetailSection title="Candidatos apartados">
        <TeamSelectionCandidateList
          candidates={candidates}
          rowStatuses={rowStatuses}
          onSelect={onSelectParticipant}
        />
      </EventDetailSection>

      <EventDetailSection title="Equipo seleccionado">
        <TeamSelectionSelectedList selected={selected} />
      </EventDetailSection>
    </div>
  )
}
