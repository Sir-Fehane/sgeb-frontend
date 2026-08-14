import { useParams } from 'react-router-dom'

import { useAttendanceParticipantsQuery } from '@/features/events/attendance/queries/useAttendanceParticipantsQuery'
import { EventAttendanceContent } from '@/features/events/attendance/components/EventAttendanceContent'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — same helper as `EventDetailPage`/
 * `TeamSelectionPage` (duplicated locally per those files' own comments:
 * feature-local, CLAUDE.md prefers this over a premature cross-page
 * abstraction).
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el pase de lista.'
}

/**
 * Routed at /eventos/:id/pase-de-lista (W-06 "Pase de lista"). Live wiring
 * layer around `EventAttendanceContent`, mirroring `TeamSelectionPage`'s
 * relationship to `TeamSelectionContent`: reuses `useEventDetailQuery` for
 * the event header context — same query key as Event Detail/Team
 * Selection, so navigating here from an already-visited event reuses that
 * cache entry rather than duplicating the request — instead of a second,
 * independent fetch.
 *
 * The roster (`GET /eventos/{id}/participaciones`) never 404s for an
 * unknown event — the pinned backend's `listarPorEvento` has no event
 * existence check and simply returns an empty array — so "not found" is
 * driven entirely by the event detail query, exactly as `EventDetailPage`/
 * `TeamSelectionPage` already do.
 *
 * Purely observational, same as the fixture-backed foundation this
 * replaces: no mutation, no callback prop, no
 * `POST /participaciones/{id}/confirmacion-llegada` of any kind — that's
 * the mesero's own device, never this panel.
 */
export function EventAttendancePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)

  const eventDetailQuery = useEventDetailQuery(idEvento)
  const participantsQuery = useAttendanceParticipantsQuery(idEvento)

  const notFound = idEvento === null || isEventoNotFoundError(eventDetailQuery.error)
  const evento = notFound ? null : (eventDetailQuery.data ?? null)
  const isLoading =
    idEvento !== null && (eventDetailQuery.isPending || participantsQuery.isPending)
  const hasRealError =
    idEvento !== null &&
    !notFound &&
    (eventDetailQuery.isError || participantsQuery.isError)
  const errorMessage = hasRealError
    ? toSafeErrorMessage(eventDetailQuery.error ?? participantsQuery.error)
    : undefined

  function handleRetry() {
    void eventDetailQuery.refetch()
    void participantsQuery.refetch()
  }

  return (
    <EventAttendanceContent
      evento={evento}
      isLoading={isLoading}
      {...(errorMessage ? { errorMessage } : {})}
      onRetry={handleRetry}
      participants={participantsQuery.data ?? []}
    />
  )
}
