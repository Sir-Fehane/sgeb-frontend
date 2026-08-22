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
  /** `null` means "not found" — a real `SGEB-3001` 404 or a malformed route id, not a loading gap. Reuses `EventDetailUnavailableState`: same concern as Event Detail's own unavailable event. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  participants: readonly TeamSelectionParticipantViewModel[]
  rowStatuses: Readonly<Record<number, TeamSelectionRowStatus>>
  rowErrorMessages?: Readonly<Record<number, string>>
  onSelectParticipant: (request: SelectParticipantRequest) => void
}

/**
 * The reusable presentational composition — header + summary + candidate
 * section + selected section, or exactly one of loading / error /
 * unavailable, selected purely from props. Mirrors `EventDetailContent`'s
 * architecture (`TeamSelectionPage` is the thin, live-query wiring
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
  rowErrorMessages,
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
  // Everything past `aparto` (seleccionado through salida) is shown here —
  // those later states belong to Attendance/Montage, out of scope for this
  // screen, but a participant who has progressed must still be visible
  // somewhere rather than silently disappear from the roster.
  const selected = participants.filter((participant) => participant.estado !== 'aparto')

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
          {...(rowErrorMessages ? { rowErrorMessages } : {})}
          onSelect={onSelectParticipant}
        />
      </EventDetailSection>

      <EventDetailSection title="Equipo seleccionado">
        <TeamSelectionSelectedList selected={selected} />
      </EventDetailSection>
    </div>
  )
}
