import { useParams } from 'react-router-dom'

import { EventDashboardContent } from '@/features/events/dashboard/components/EventDashboardContent'
import { useEventDashboardQuery } from '@/features/events/dashboard/queries/useEventDashboardQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

/** Never renders `technical_message` — same helper duplicated across every event-scoped page (`EventClosurePage`, `EventMontagePage`); CLAUDE.md prefers this over a premature cross-page abstraction. */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el resumen operativo.'
}

/**
 * Routed at /eventos/:id/panel-operativo — the real per-event operational
 * command-center, backed by `GET /eventos/{id}/dashboard`. A SGEB-0004
 * partial success still resolves this query normally (see
 * `eventDashboardApi.ts`): it is never treated as an error here, only as
 * `dashboard.partial` for `EventDashboardContent` to render honestly.
 *
 * `useEventRealtimeRoom` joins this event's Socket.IO room so the seven
 * backend events that can change what this endpoint aggregates
 * (`cupo:actualizado`, `participacion:cambio`, `mesa:cambio`,
 * `checklist:cambio`, `orden:cambio`, `dispensado:cambio`,
 * `alerta:insumo`, `solicitud:cambio`) invalidate this query without a
 * manual reload — see `SocketProvider`'s own domain-event handlers.
 */
export function EventDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  useEventRealtimeRoom(idEvento)

  const dashboardQuery = useEventDashboardQuery(idEvento)

  const notFound = idEvento === null || isEventoNotFoundError(dashboardQuery.error)
  const dashboard = notFound ? null : (dashboardQuery.data ?? null)
  const isLoading = idEvento !== null && dashboardQuery.isPending
  const hasRealError = idEvento !== null && !notFound && dashboardQuery.isError
  const errorMessage = hasRealError ? toSafeErrorMessage(dashboardQuery.error) : undefined

  return (
    <EventDashboardContent
      idEvento={idEvento ?? -1}
      dashboard={dashboard}
      isLoading={isLoading}
      {...(errorMessage ? { errorMessage } : {})}
      onRetry={() => {
        void dashboardQuery.refetch()
      }}
    />
  )
}
