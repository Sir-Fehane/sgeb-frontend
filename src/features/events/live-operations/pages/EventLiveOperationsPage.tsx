import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { LiveOperationsContent } from '@/features/events/live-operations/components/LiveOperationsContent'
import { useMarkParticipantSalidaMutation } from '@/features/events/live-operations/queries/useMarkParticipantSalidaMutation'
import type {
  LiveOperationsRowStatus,
  MarkParticipantSalidaRequest,
} from '@/features/events/live-operations/types/liveOperations'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { useTeamSelectionParticipantsQuery } from '@/features/events/team-selection/queries/useTeamSelectionParticipantsQuery'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — same helper as `TeamSelectionPage`/
 * `EventDetailPage` (duplicated locally per those files' own comments: one
 * more call site, feature-local, CLAUDE.md prefers this over a premature
 * cross-page abstraction).
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar la operación en vivo.'
}

/**
 * Routed at /eventos/:id/operacion-en-vivo. Live wiring layer around
 * `LiveOperationsContent`, mirroring `TeamSelectionPage`'s relationship to
 * `TeamSelectionContent`.
 *
 * Reuses `useEventDetailQuery` for the event header context instead of a
 * second, independent fetch — same query key as Event Detail/Team
 * Selection/Attendance/Montage/Closure/Payments, so navigating here from
 * an already-visited event reuses that cache entry.
 *
 * Reuses `useTeamSelectionParticipantsQuery` for the roster too, rather
 * than a second, independent `GET /eventos/{id}/participaciones` cache:
 * that query already fetches the full, authoritative
 * `TeamSelectionParticipantViewModel[]` — `{ idParticipacion, nombre,
 * puesto, estado }` over the complete 7-value `estado` enum, including
 * `vinculo`/`salida` — the exact same server collection this page's own
 * `markParticipantSalida` mutation writes to. Two independent caches over
 * one mutated resource would risk one of them holding a stale `vinculo`
 * row after the other's invalidation; see
 * `useMarkParticipantSalidaMutation`'s own comment. `LiveOperationsContent`
 * still only knows its own `LiveOperationsParticipantViewModel` type (kept
 * feature-local, per `types/liveOperations.ts`'s own comment) — the two
 * types are structurally identical by design, so no runtime mapping is
 * needed here, only the shared query.
 *
 * The roster never 404s for an unknown event — the pinned backend's
 * `listarPorEvento` has no event existence check — so "not found" is
 * driven entirely by the event detail query, exactly as `TeamSelectionPage`
 * already does.
 *
 * `rowStatuses`/`rowErrors` are local, per-row UI state for the in-flight
 * exit action — never a mirror of server data. On success, the mutation
 * invalidates the roster query (and Closure's readiness query); the real
 * refetch is what actually moves the row to its terminal presentation.
 */
export function EventLiveOperationsPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)

  const eventDetailQuery = useEventDetailQuery(idEvento)
  const participantsQuery = useTeamSelectionParticipantsQuery(idEvento)
  const markSalidaMutation = useMarkParticipantSalidaMutation(idEvento ?? -1)

  const [rowStatuses, setRowStatuses] = useState<Record<number, LiveOperationsRowStatus>>(
    {},
  )
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

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

  function handleMarkSalida(request: MarkParticipantSalidaRequest) {
    if (rowStatuses[request.idParticipacion] === 'marking') {
      return
    }

    setRowStatuses((previous) => ({
      ...previous,
      [request.idParticipacion]: 'marking',
    }))
    setRowErrors((previous) => {
      if (!(request.idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[request.idParticipacion]
      return next
    })

    markSalidaMutation.mutate(request.idParticipacion, {
      onSuccess: () => {
        setRowStatuses((previous) => ({
          ...previous,
          [request.idParticipacion]: 'idle',
        }))
      },
      onError: (error) => {
        setRowStatuses((previous) => ({
          ...previous,
          [request.idParticipacion]: 'error',
        }))
        setRowErrors((previous) => ({
          ...previous,
          [request.idParticipacion]: toSafeErrorMessage(error),
        }))
      },
    })
  }

  return (
    <LiveOperationsContent
      evento={evento}
      isLoading={isLoading}
      {...(errorMessage ? { errorMessage } : {})}
      onRetry={handleRetry}
      participants={participantsQuery.data ?? []}
      rowStatuses={rowStatuses}
      rowErrorMessages={rowErrors}
      onMarkSalida={handleMarkSalida}
    />
  )
}
