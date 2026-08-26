import { useParams } from 'react-router-dom'

import { useEventClosureReadinessQuery } from '@/features/events/closure/queries/useEventClosureReadinessQuery'
import { EventPaymentsContent } from '@/features/events/payments/components/EventPaymentsContent'
import { useCalculateEventPaymentsMutation } from '@/features/events/payments/queries/useCalculateEventPaymentsMutation'
import { useEventPaymentsQuery } from '@/features/events/payments/queries/useEventPaymentsQuery'
import { useMarkPaymentFailedMutation } from '@/features/events/payments/queries/useMarkPaymentFailedMutation'
import { useMarkPaymentPaidMutation } from '@/features/events/payments/queries/useMarkPaymentPaidMutation'
import { isPaymentFallidoRecorded } from '@/features/events/payments/services/paymentsApi'
import type {
  EventPaymentViewModel,
  MarkFailedRequest,
  MarkPaidRequest,
  PagoViewModel,
} from '@/features/events/payments/types/payments'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { useTeamSelectionParticipantsQuery } from '@/features/events/team-selection/queries/useTeamSelectionParticipantsQuery'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — same helper as `EventClosurePage`/
 * `EventDetailPage`/`EventMontagePage` (duplicated locally per those
 * files' own comments: CLAUDE.md prefers this over a premature
 * cross-page abstraction).
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar los pagos del evento.'
}

/**
 * Joins each payment with the waiter name from the already-live Team
 * Selection roster (`Pago` never carries a name of its own). A payment
 * whose participación isn't in the roster response falls back to a
 * neutral label instead of inventing a name — see
 * `types/payments.ts`'s `EventPaymentViewModel` comment.
 */
function joinPaymentsWithNombre(
  payments: readonly PagoViewModel[],
  nombreByParticipacion: ReadonlyMap<number, string>,
): EventPaymentViewModel[] {
  return payments.map((payment) => ({
    ...payment,
    nombre:
      nombreByParticipacion.get(payment.idParticipacion) ??
      `Participación ${String(payment.idParticipacion)}`,
  }))
}

/**
 * Routed at /eventos/:id/pagos ("Pagos") — `capitán`/`admin` only on this
 * frontend: every payments endpoint this page calls
 * (`GET .../pagos`, `POST .../calcular`, `PATCH /pagos/{id}/pagado`,
 * `PATCH /pagos/{id}/fallido`) is `middleware.rol(['capitan', 'admin'])`
 * on the pinned backend, and a `mesero` session never uses this web
 * console at all (native iOS app, docs/FrontendArchitecture.md §2/§10.3).
 * `canView` is the route-level backstop for a direct `/eventos/:id/pagos`
 * visit — `EventPaymentsContent` renders `EventPaymentsForbiddenState`
 * instead of the real payments list, and every query below is only given
 * the real `idEvento` when `canView` is true (`skipToken` otherwise, via
 * each hook's existing `idEvento: null` convention) so none of them ever
 * fires for a `mesero` session.
 *
 * LIVE wiring for the payments list (`GET /eventos/{id}/pagos`), closure
 * readiness (`GET /eventos/{id}/cierre`, reused directly from the Closure
 * feature), payment calculation (`POST /pagos/calcular`), and the two
 * per-payment mutations (`PATCH /pagos/{id}/pagado`,
 * `PATCH /pagos/{id}/fallido`) — the exact three captain actions this
 * screen already scoped itself to. No bank/gateway integration, no bulk
 * `/pagos/aprobar`, no participant-salida mutation, no event-finalization
 * mutation, no Comanda, no Socket.IO.
 */
export function EventPaymentsPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)

  const session = useOidcSessionStore((state) => state.session)
  const canView =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  const eventDetailQuery = useEventDetailQuery(canView ? idEvento : null)
  const readinessQuery = useEventClosureReadinessQuery(canView ? idEvento : null)
  const participantsQuery = useTeamSelectionParticipantsQuery(canView ? idEvento : null)
  const paymentsQuery = useEventPaymentsQuery(canView ? idEvento : null)
  const calculateMutation = useCalculateEventPaymentsMutation(idEvento ?? -1)
  const markPaidMutation = useMarkPaymentPaidMutation(idEvento ?? -1)
  const markFailedMutation = useMarkPaymentFailedMutation(idEvento ?? -1)

  const notFound = idEvento === null || isEventoNotFoundError(eventDetailQuery.error)
  const evento = notFound ? null : (eventDetailQuery.data ?? null)
  const readiness = notFound ? null : (readinessQuery.data ?? null)

  const nombreByParticipacion = new Map(
    (participantsQuery.data ?? []).map((participant) => [
      participant.idParticipacion,
      participant.nombre,
    ]),
  )
  const payments = joinPaymentsWithNombre(paymentsQuery.data ?? [], nombreByParticipacion)

  const isLoading =
    canView &&
    idEvento !== null &&
    !notFound &&
    (eventDetailQuery.isPending ||
      readinessQuery.isPending ||
      participantsQuery.isPending ||
      paymentsQuery.isPending)

  const hasRealError =
    canView &&
    idEvento !== null &&
    !notFound &&
    (eventDetailQuery.isError ||
      readinessQuery.isError ||
      participantsQuery.isError ||
      paymentsQuery.isError)

  const errorMessage = hasRealError
    ? toSafeErrorMessage(
        eventDetailQuery.error ??
          readinessQuery.error ??
          participantsQuery.error ??
          paymentsQuery.error,
      )
    : undefined

  function handleRetry() {
    void eventDetailQuery.refetch()
    void readinessQuery.refetch()
    void participantsQuery.refetch()
    void paymentsQuery.refetch()
  }

  async function handleCalculate() {
    if (idEvento === null || calculateMutation.isPending) {
      return
    }
    await calculateMutation.mutateAsync()
  }

  async function handleMarkPaid({ idPago, referencia }: MarkPaidRequest) {
    await markPaidMutation.mutateAsync({ idPago, referencia })
  }

  async function handleMarkFailed({ idPago, motivo }: MarkFailedRequest) {
    try {
      await markFailedMutation.mutateAsync({ idPago, motivo })
    } catch (error) {
      // `PATCH /pagos/{id}/fallido` always responds as an error even when
      // it successfully recorded the failure — see
      // `services/paymentsApi.ts`'s `isPaymentFallidoRecorded`. Any other
      // error is a real failure and must still surface to the row's
      // existing danger-alert handling.
      if (!isPaymentFallidoRecorded(error)) {
        throw error
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EventPaymentsContent
        canView={canView}
        evento={evento}
        isLoading={isLoading}
        {...(errorMessage ? { errorMessage } : {})}
        onRetry={handleRetry}
        readiness={readiness}
        payments={payments}
        onCalculate={handleCalculate}
        isCalculating={calculateMutation.isPending}
        onMarkPaid={handleMarkPaid}
        onMarkFailed={handleMarkFailed}
      />
    </div>
  )
}
