import { useRef } from 'react'
import { useParams } from 'react-router-dom'

import { EventClosureContent } from '@/features/events/closure/components/EventClosureContent'
import { useCreateMermaReportMutation } from '@/features/events/closure/queries/useCreateMermaReportMutation'
import { useEventClosureReadinessQuery } from '@/features/events/closure/queries/useEventClosureReadinessQuery'
import { useMermaReportsQuery } from '@/features/events/closure/queries/useMermaReportsQuery'
import type { CreateWasteReportFormValues } from '@/features/events/closure/schemas/wasteReportSchema'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — same helper as `EventDetailPage`/
 * `EventMontagePage` (duplicated locally per those files' own comments:
 * CLAUDE.md prefers this over a premature cross-page abstraction).
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el cierre del evento.'
}

/**
 * Routed at /eventos/:id/cierre ("Cierre del evento"). LIVE wiring for
 * closure-readiness diagnostics (`GET /eventos/{id}/cierre`), existing
 * merma reports (`GET /eventos/{id}/reportes-merma`), and merma
 * registration (`POST /eventos/{id}/reportes-merma`) — the exact three
 * operations the pre-existing foundation already scoped this screen to.
 * No payment calculation, no event-finalization mutation, no Comanda, no
 * Socket.IO: all still out of scope, same as before this branch.
 */
export function EventClosurePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)

  const eventDetailQuery = useEventDetailQuery(idEvento)
  const readinessQuery = useEventClosureReadinessQuery(idEvento)
  const mermaReportsQuery = useMermaReportsQuery(idEvento)
  const createMermaReportMutation = useCreateMermaReportMutation(idEvento ?? -1)
  // A plain ref, not `createMermaReportMutation.isPending`: TanStack
  // Query's mutation state updates through its own external store and is
  // not guaranteed to have flushed between two synchronous clicks, unlike
  // a ref mutation (which is immediate) — see this branch's report for
  // the isolated repro that motivated this over the more obvious
  // `isPending` check.
  const isSubmittingRef = useRef(false)

  const notFound = idEvento === null || isEventoNotFoundError(eventDetailQuery.error)
  const evento = notFound ? null : (eventDetailQuery.data ?? null)
  const readiness = notFound ? null : (readinessQuery.data ?? null)
  const mermaReports = mermaReportsQuery.data ?? []

  const isLoading =
    idEvento !== null &&
    (eventDetailQuery.isPending ||
      readinessQuery.isPending ||
      mermaReportsQuery.isPending)

  const hasRealError =
    idEvento !== null &&
    !notFound &&
    (eventDetailQuery.isError || readinessQuery.isError || mermaReportsQuery.isError)

  const errorMessage = hasRealError
    ? toSafeErrorMessage(
        eventDetailQuery.error ?? readinessQuery.error ?? mermaReportsQuery.error,
      )
    : undefined

  function handleRetry() {
    void eventDetailQuery.refetch()
    void readinessQuery.refetch()
    void mermaReportsQuery.refetch()
  }

  async function handleSubmitWasteReport(values: CreateWasteReportFormValues) {
    if (idEvento === null || isSubmittingRef.current) {
      return
    }
    isSubmittingRef.current = true
    try {
      await createMermaReportMutation.mutateAsync(values)
    } finally {
      isSubmittingRef.current = false
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EventClosureContent
        evento={evento}
        isLoading={isLoading}
        {...(errorMessage ? { errorMessage } : {})}
        onRetry={handleRetry}
        readiness={readiness}
        mermaReports={mermaReports}
        onSubmitWasteReport={handleSubmitWasteReport}
        isSubmittingWasteReport={createMermaReportMutation.isPending}
        {...(createMermaReportMutation.isError
          ? {
              wasteReportErrorMessage: toSafeErrorMessage(
                createMermaReportMutation.error,
              ),
            }
          : {})}
      />
    </div>
  )
}
