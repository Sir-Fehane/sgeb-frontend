import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { EventClosureContent } from '@/features/events/closure/components/EventClosureContent'
import { useCreateMermaReportMutation } from '@/features/events/closure/queries/useCreateMermaReportMutation'
import { useEventClosureReadinessQuery } from '@/features/events/closure/queries/useEventClosureReadinessQuery'
import { useFinalizeEventoMutation } from '@/features/events/closure/queries/useFinalizeEventoMutation'
import { useMermaReportsQuery } from '@/features/events/closure/queries/useMermaReportsQuery'
import type { CreateWasteReportFormValues } from '@/features/events/closure/schemas/wasteReportSchema'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { EVENT_STATUS_TRANSITION_TOAST_TITLES } from '@/features/events/utils/eventStatusPresentation'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { Toast } from '@/shared/components'

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
 * merma reports (`GET /eventos/{id}/reportes-merma`), merma registration
 * (`POST /eventos/{id}/reportes-merma`), and event finalization
 * (`PATCH /eventos/{id}/estado` → `finalizado`) — product ownership for
 * finalization was confirmed to belong here (see this branch's report),
 * so that stale exclusion no longer applies. No payment calculation, no
 * Comanda, no Socket.IO, no participant-salida mutation: all still out of
 * scope, same as before this branch.
 */
export function EventClosurePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)

  const eventDetailQuery = useEventDetailQuery(idEvento)
  const readinessQuery = useEventClosureReadinessQuery(idEvento)
  const mermaReportsQuery = useMermaReportsQuery(idEvento)
  const createMermaReportMutation = useCreateMermaReportMutation(idEvento ?? -1)
  const finalizeEventoMutation = useFinalizeEventoMutation(idEvento ?? -1)
  // A plain ref, not `createMermaReportMutation.isPending`: TanStack
  // Query's mutation state updates through its own external store and is
  // not guaranteed to have flushed between two synchronous clicks, unlike
  // a ref mutation (which is immediate) — see this branch's report for
  // the isolated repro that motivated this over the more obvious
  // `isPending` check.
  const isSubmittingRef = useRef(false)
  // Same reasoning and same fix as `isSubmittingRef` above, applied to the
  // one other real mutation this page owns.
  const isFinalizingRef = useRef(false)

  /** "Evento finalizado" success feedback — mirrors `EventDetailPage`'s own `pageFeedback` slot for the other `PATCH /eventos/{id}/estado` transitions, same shared copy source (`EVENT_STATUS_TRANSITION_TOAST_TITLES`). */
  const [finalizeFeedbackTitle, setFinalizeFeedbackTitle] = useState<string | null>(null)

  /**
   * UX-only role gate — sourced from the real, already-authenticated OIDC
   * session (`rol` claim), never a fabricated or assumed value. Mirrors
   * `EventDetailPage`'s `canManageComanda`: this cannot and does not
   * compensate for the pinned backend's confirmed per-event ownership gap
   * on `PATCH /eventos/{id}/estado` — the backend route role guard remains
   * the actual authorization boundary.
   */
  const session = useOidcSessionStore((state) => state.session)
  const canFinalizeEvento =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

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

  function handleFinalizeEvento() {
    if (idEvento === null || isFinalizingRef.current) {
      return
    }
    isFinalizingRef.current = true
    finalizeEventoMutation.mutate(undefined, {
      onSuccess: () => {
        setFinalizeFeedbackTitle(EVENT_STATUS_TRANSITION_TOAST_TITLES.finalizado)
      },
      onSettled: () => {
        isFinalizingRef.current = false
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {finalizeFeedbackTitle ? (
        <Toast
          title={finalizeFeedbackTitle}
          onDismiss={() => {
            setFinalizeFeedbackTitle(null)
          }}
        />
      ) : null}

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
        canFinalizeEvento={canFinalizeEvento}
        onFinalizeEvento={handleFinalizeEvento}
        isFinalizingEvento={finalizeEventoMutation.isPending}
        {...(finalizeEventoMutation.isError
          ? {
              finalizeEventoErrorMessage: toSafeErrorMessage(
                finalizeEventoMutation.error,
              ),
            }
          : {})}
      />
    </div>
  )
}
