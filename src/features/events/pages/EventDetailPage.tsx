import { useParams } from 'react-router-dom'

import { EventDetailContent } from '@/features/events/components/EventDetailContent'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — mirrors `EventsPage`'s own
 * `toSafeErrorMessage` (docs/FrontendArchitecture.md §4.1). Duplicated
 * locally rather than shared: two call sites, both feature-local, and
 * CLAUDE.md prefers this over a premature cross-page abstraction.
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el evento.'
}

/**
 * Routed at /eventos/:id. Live wiring layer around `EventDetailContent`,
 * mirroring `EventsPage`'s relationship to `EventsContent`.
 *
 * The route param is validated (`parseEventId`) before anything else — a
 * malformed id (empty, zero, negative, decimal, non-numeric, unsafe
 * integer) never reaches the network; `useEventDetailQuery` receives
 * `null` and skips the request entirely (`skipToken`), and this page
 * renders the existing "not found" state immediately rather than reading
 * that skipped query's (permanently pending) status.
 *
 * A well-formed id that the backend doesn't recognize resolves to the
 * same "not found" state: `SGEB-3001` (`isEventoNotFoundError`) is mapped
 * to `evento: null` rather than `errorMessage`, reusing
 * `EventDetailUnavailableState` — the malformed-id case and the
 * genuinely-missing-event case are presented identically, exactly as the
 * fixture-backed foundation already did.
 *
 * Comanda, Team Selection, Attendance, Montage, Closure, and Payments stay
 * exactly as this foundation already built them
 * (`EventDetailComandaSection`/`EventDetailRoadmapSection`) — this branch
 * only replaces the source of `evento` itself.
 */
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const detailQuery = useEventDetailQuery(idEvento)

  const notFound = idEvento === null || isEventoNotFoundError(detailQuery.error)
  const evento = notFound ? null : (detailQuery.data ?? null)
  const isLoading = idEvento !== null && detailQuery.isPending
  const hasRealError = idEvento !== null && detailQuery.isError && !notFound

  return (
    <div className="flex flex-col gap-6">
      <EventDetailContent
        evento={evento}
        isLoading={isLoading}
        {...(hasRealError ? { errorMessage: toSafeErrorMessage(detailQuery.error) } : {})}
        onRetry={() => void detailQuery.refetch()}
      />
    </div>
  )
}
