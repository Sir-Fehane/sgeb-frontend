import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { EventAttendanceErrorState } from '@/features/events/attendance/components/EventAttendanceErrorState'
import { EventAttendanceHeader } from '@/features/events/attendance/components/EventAttendanceHeader'
import { EventAttendanceLoadingState } from '@/features/events/attendance/components/EventAttendanceLoadingState'
import { EventAttendanceParticipantList } from '@/features/events/attendance/components/EventAttendanceParticipantList'
import { EventAttendanceSummary } from '@/features/events/attendance/components/EventAttendanceSummary'
import type { EventAttendanceParticipantViewModel } from '@/features/events/attendance/types/attendance'
import { arrivalRequiresAttention } from '@/features/events/attendance/utils/attendancePresentation'

export interface EventAttendanceContentProps {
  /** `null` means "not found" — a fixture-lookup miss or a malformed route id, not a loading gap. Reuses `EventDetailUnavailableState`: same concern as Event Detail's own unavailable event. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  participants: readonly EventAttendanceParticipantViewModel[]
}

/**
 * The reusable presentational composition — header + summary +
 * participant list, or exactly one of loading / error / unavailable,
 * selected purely from props. Entirely read-only: no callback prop of
 * any kind exists here, matching this screen's observational scope. All
 * summary counts are plain derivations of `participants` — never a
 * second, independently-maintained source (see `EventAttendanceSummary`).
 */
export function EventAttendanceContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  participants,
}: EventAttendanceContentProps) {
  if (isLoading) {
    return <EventAttendanceLoadingState />
  }

  if (errorMessage) {
    return <EventAttendanceErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento) {
    return <EventDetailUnavailableState />
  }

  const asistenciaConfirmadaTotal = participants.filter(
    (participant) =>
      participant.estadoParticipacion === 'confirmo_asistencia' ||
      participant.estadoParticipacion === 'confirmo_llegada',
  ).length
  const llegadaConfirmadaTotal = participants.filter(
    (participant) => participant.estadoParticipacion === 'confirmo_llegada',
  ).length
  const requierenAtencionTotal = participants.filter((participant) =>
    arrivalRequiresAttention(participant.ultimaConfirmacionLlegada),
  ).length

  return (
    <div className="flex flex-col gap-6">
      <EventAttendanceHeader idEvento={evento.idEvento} tituloEvento={evento.titulo} />

      <EventAttendanceSummary
        seleccionadosTotal={participants.length}
        asistenciaConfirmadaTotal={asistenciaConfirmadaTotal}
        llegadaConfirmadaTotal={llegadaConfirmadaTotal}
        requierenAtencionTotal={requierenAtencionTotal}
      />

      <EventDetailSection title="Meseros seleccionados">
        <EventAttendanceParticipantList participants={participants} />
      </EventDetailSection>
    </div>
  )
}
