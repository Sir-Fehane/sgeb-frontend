import { useState } from 'react'

import { ReportsContent } from '@/features/reports/components/ReportsContent'
import { useEventMermaSummaryQuery } from '@/features/reports/queries/useEventMermaSummaryQuery'
import { useEventRatingsQuery } from '@/features/reports/queries/useEventRatingsQuery'
import { DEFAULT_EVENTS_FILTER_STATE } from '@/features/events/types/event'
import { useEventsListQuery } from '@/features/events/queries/useEventsListQuery'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/** Never renders `technical_message` — same helper duplicated across every live-query page (`EventClosurePage`, `EventDashboardPage`). */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar los reportes.'
}

/**
 * Routed at /reportes. Rebuilt on feature/operations-and-reports-live:
 * the previous version was 100% fixture, built against a documented
 * `GET /dashboard/meseros` shape confirmed NOT to match the real backend
 * (see `types/report.ts`'s module comment). This version is real, and
 * `ReportsContent` renders it as two separate information-architecture
 * groups (see that component's own comment): an event-scoped group (an
 * event picker sourced from `GET /eventos`, reused from `features/events`
 * — the canonical source for "list of events," never duplicated here —
 * plus live merma and calificaciones reads for the selected event, and a
 * Pagos shortcut) and an unrelated, non-event-scoped "Histórico de
 * personal" group (an honest deferred card — no backend support exists
 * for that report at all).
 *
 * `canViewRatings` is a UX-only role gate sourced from the real,
 * already-authenticated OIDC session — `GET /eventos/{id}/calificaciones`
 * is capitán/admin only server-side regardless of what this frontend
 * does; this only avoids showing a `mesero` session a section that would
 * always fail with `SGEB-1004`, same pattern `EventClosurePage`'s
 * `canFinalizeEvento` already uses.
 */
export function ReportsPage() {
  const [idEvento, setIdEvento] = useState<number | null>(null)
  const [soloBajas, setSoloBajas] = useState(false)

  const eventsQuery = useEventsListQuery(DEFAULT_EVENTS_FILTER_STATE)

  const session = useOidcSessionStore((state) => state.session)
  const canViewRatings =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  const mermaSummaryQuery = useEventMermaSummaryQuery(idEvento)
  const ratingsQuery = useEventRatingsQuery(idEvento, soloBajas, canViewRatings)

  return (
    <ReportsContent
      events={eventsQuery.data ?? []}
      isLoadingEvents={eventsQuery.isPending}
      {...(eventsQuery.isError
        ? { eventsErrorMessage: toSafeErrorMessage(eventsQuery.error) }
        : {})}
      onRetryEvents={() => {
        void eventsQuery.refetch()
      }}
      idEvento={idEvento}
      onEventoChange={setIdEvento}
      canViewRatings={canViewRatings}
      mermaSummary={mermaSummaryQuery.data ?? null}
      isLoadingMerma={idEvento !== null && mermaSummaryQuery.isPending}
      {...(mermaSummaryQuery.isError
        ? { mermaErrorMessage: toSafeErrorMessage(mermaSummaryQuery.error) }
        : {})}
      onRetryMerma={() => {
        void mermaSummaryQuery.refetch()
      }}
      ratingsSummary={ratingsQuery.data ?? null}
      soloBajas={soloBajas}
      onSoloBajasChange={setSoloBajas}
      isLoadingRatings={idEvento !== null && canViewRatings && ratingsQuery.isPending}
      {...(ratingsQuery.isError
        ? { ratingsErrorMessage: toSafeErrorMessage(ratingsQuery.error) }
        : {})}
      onRetryRatings={() => {
        void ratingsQuery.refetch()
      }}
    />
  )
}
