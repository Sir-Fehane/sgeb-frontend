import { useState } from 'react'

import { ReportsContent } from '@/features/reports/components/ReportsContent'
import { useEventMermaSummaryQuery } from '@/features/reports/queries/useEventMermaSummaryQuery'
import { useEventRatingsQuery } from '@/features/reports/queries/useEventRatingsQuery'
import { useWaiterPerformanceQuery } from '@/features/reports/queries/useWaiterPerformanceQuery'
import { WaiterPerformanceInvalidWaiterError } from '@/features/reports/services/reportsApi'
import {
  createDefaultWaiterPerformanceFilterState,
  type WaiterPerformanceFilterState,
} from '@/features/reports/types/report'
import { DEFAULT_EVENTS_FILTER_STATE } from '@/features/events/types/event'
import { useEventsListQuery } from '@/features/events/queries/useEventsListQuery'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { DEFAULT_WAITERS_FILTER_STATE } from '@/features/waiters/types/waiter'
import { useWaitersQuery } from '@/features/waiters/queries/useWaitersQuery'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/** Never renders `technical_message` — same helper duplicated across every live-query page (`EventClosurePage`, `EventDashboardPage`). */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar los reportes.'
}

/**
 * Same as `toSafeErrorMessage`, plus recognizing
 * `WaiterPerformanceInvalidWaiterError` — the narrow, local re-framing of
 * the confirmed `SGEB-1003`-for-nonexistent-`uuidMesero` backend gap (see
 * `services/reportsApi.ts`'s own comment). Only this one query's errors
 * ever pass through here; every other SGEB-1003 in the app keeps its
 * normal session-expired handling untouched.
 */
function toSafeWaiterPerformanceErrorMessage(error: unknown): string {
  if (error instanceof WaiterPerformanceInvalidWaiterError) {
    return error.message
  }
  return toSafeErrorMessage(error)
}

/**
 * Routed at /reportes. `ReportsContent` renders two separate
 * information-architecture groups (see that component's own comment): an
 * event-scoped group (an event picker sourced from `GET /eventos`, reused
 * from `features/events` — the canonical source for "list of events,"
 * never duplicated here — plus live merma and calificaciones reads for the
 * selected event, and a Pagos shortcut) and an unrelated, non-event-scoped
 * "Histórico de personal" group: `WaiterPerformanceSection`, a real,
 * paginated `GET /reportes/desempeno-meseros` report filtered by date range
 * and an optional mesero (`GET /usuarios?rol=mesero`, reused from
 * `features/waiters` — never a duplicated user list). This group
 * deliberately owns its own filter/page state, entirely independent of
 * `idEvento` — selecting a different event above must never refetch or
 * reset it.
 *
 * `canViewRatings`/`canViewWaiterPerformance` are UX-only role gates
 * sourced from the real, already-authenticated OIDC session — both
 * underlying endpoints are capitán/admin only server-side regardless of
 * what this frontend does; these only avoid showing a `mesero` session a
 * section that would always fail (`SGEB-1004`), same pattern
 * `EventClosurePage`'s `canFinalizeEvento` already uses.
 */
export function ReportsPage() {
  const [idEvento, setIdEvento] = useState<number | null>(null)
  const [soloBajas, setSoloBajas] = useState(false)

  const [waiterPerformanceFilters, setWaiterPerformanceFilters] =
    useState<WaiterPerformanceFilterState>(() =>
      createDefaultWaiterPerformanceFilterState(),
    )
  const [waiterPerformancePage, setWaiterPerformancePage] = useState(1)

  const eventsQuery = useEventsListQuery(DEFAULT_EVENTS_FILTER_STATE)

  const session = useOidcSessionStore((state) => state.session)
  const canViewRatings =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')
  // Computed independently from `canViewRatings` even though both currently
  // resolve to the same capitán/admin check — `GET
  // /reportes/desempeno-meseros` and `GET /eventos/{id}/calificaciones` are
  // unrelated authorization concerns server-side
  // (`middleware.rol(['capitan','admin'])` vs `ComensalController`'s own
  // check) that only happen to share the same role set today.
  const canViewWaiterPerformance =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  const mermaSummaryQuery = useEventMermaSummaryQuery(idEvento)
  const ratingsQuery = useEventRatingsQuery(idEvento, soloBajas, canViewRatings)

  // A historical, cross-event report — deliberately never reads `idEvento`,
  // so selecting a different event above never refetches it (this
  // branch's own IA audit).
  const waitersQuery = useWaitersQuery(DEFAULT_WAITERS_FILTER_STATE)
  const waiterPerformanceQuery = useWaiterPerformanceQuery(
    waiterPerformanceFilters,
    waiterPerformancePage,
    canViewWaiterPerformance,
  )

  function handleWaiterPerformanceFiltersChange(filters: WaiterPerformanceFilterState) {
    setWaiterPerformanceFilters(filters)
    setWaiterPerformancePage(1)
  }

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
      waiterPerformance={{
        canView: canViewWaiterPerformance,
        filters: waiterPerformanceFilters,
        onFiltersChange: handleWaiterPerformanceFiltersChange,
        onPageChange: setWaiterPerformancePage,
        waiters: waitersQuery.data ?? [],
        data: waiterPerformanceQuery.data ?? null,
        isLoading: canViewWaiterPerformance && waiterPerformanceQuery.isPending,
        ...(waiterPerformanceQuery.isError
          ? {
              errorMessage: toSafeWaiterPerformanceErrorMessage(
                waiterPerformanceQuery.error,
              ),
            }
          : {}),
        onRetry: () => {
          void waiterPerformanceQuery.refetch()
        },
      }}
    />
  )
}
