import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { findEventClosureReadiness } from '@/features/events/closure/fixtures/closureFixtures'
import { findEventDetailFixture } from '@/features/events/fixtures/eventDetailFixtures'
import { EventPaymentsContent } from '@/features/events/payments/components/EventPaymentsContent'
import {
  calculatePaymentsResult,
  findEventPayments,
} from '@/features/events/payments/fixtures/paymentsFixtures'
import type {
  EventPaymentViewModel,
  MarkFailedRequest,
  MarkPaidRequest,
} from '@/features/events/payments/types/payments'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /eventos/:id/pagos ("Pagos"). Entirely presentation-only,
 * exactly like `EventClosurePage`: `findEventClosureReadiness` (reused
 * directly from the Closure feature — never a second, independently
 * maintained copy) and `findEventPayments` are development/demo data,
 * never real `GET /eventos/{id}/cierre` or `GET /eventos/{id}/pagos`
 * responses. No Axios, no TanStack Query, no network request of any
 * kind, no bank/gateway integration, no bulk `/pagos/aprobar`.
 *
 * `handleCalculate`/`handleMarkPaid`/`handleMarkFailed` model the three
 * documented captain actions this screen owns
 * (`POST /pagos/calcular`, `PATCH /pagos/{id}/pagado`,
 * `PATCH /pagos/{id}/fallido`) entirely in local component state, never
 * persisted, never computing a payment amount from a frontend formula.
 */

/**
 * `calculatePaymentsResult` returns a STATIC per-event fixture (see that
 * function's own doc comment) — it has no way to know about a payment
 * this session locally marked `pagado` via `handleMarkPaid` after the
 * page mounted. Without this step, clicking "Recalcular pagos" after a
 * local mark-paid action would silently overwrite that row with the
 * fixture's un-paid version of the same `idPago`, regressing a
 * documented-terminal payment back to `pendiente`/`fallido` — which the
 * real, idempotent `/pagos/calcular` never does ("pagado es historia y
 * NO se recalcula").
 *
 * This is deliberately narrow: it carries forward ONLY rows the current
 * local state already has as `pagado` (the one state the contract
 * documents as terminal), and does nothing else — no `fallido ->
 * pendiente` inference, no `cancelado` preservation rule (not
 * contractually guaranteed), no state machine. Every other row is taken
 * exactly as `calculatePaymentsResult` authored it.
 */
function preservePaidRows(
  calculatedPayments: readonly EventPaymentViewModel[],
  currentPayments: readonly EventPaymentViewModel[],
): EventPaymentViewModel[] {
  return calculatedPayments.map((payment) => {
    const currentPayment = currentPayments.find((p) => p.idPago === payment.idPago)
    return currentPayment?.estado === 'pagado' ? currentPayment : payment
  })
}

export function EventPaymentsPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const evento = idEvento === null ? null : findEventDetailFixture(idEvento)
  const readiness = idEvento === null ? null : findEventClosureReadiness(idEvento)

  const [payments, setPayments] = useState<EventPaymentViewModel[]>(() =>
    idEvento === null ? [] : [...findEventPayments(idEvento)],
  )
  const [isCalculating, setIsCalculating] = useState(false)

  async function handleCalculate() {
    if (idEvento === null) {
      return
    }
    setIsCalculating(true)
    await Promise.resolve()
    // `calculatePaymentsResult` reads only `idEvento` — the (fixture)
    // result comes back prebuilt, never derived from `payments` above.
    // `preservePaidRows` then applies the one narrow, documented
    // exception: a row this session already marked `pagado` locally
    // must not regress just because the static fixture doesn't know
    // about it.
    const result = calculatePaymentsResult(idEvento)
    setPayments((previous) => preservePaidRows(result.pagos, previous))
    setIsCalculating(false)
  }

  async function handleMarkPaid({ idPago, referencia }: MarkPaidRequest) {
    await Promise.resolve()
    // `fechaPago` here is a LOCAL DEMO timestamp only — the real
    // `PATCH /pagos/{id}/pagado` response would return the server's own
    // `fecha_pago`, never a client-generated one. This is never claimed
    // to be that field's eventual live value.
    const fechaPagoDemo = new Date().toISOString()
    setPayments((previous) =>
      previous.map((payment) =>
        payment.idPago === idPago
          ? { ...payment, estado: 'pagado', referencia, fechaPago: fechaPagoDemo }
          : payment,
      ),
    )
  }

  async function handleMarkFailed({ idPago }: MarkFailedRequest) {
    await Promise.resolve()
    setPayments((previous) =>
      previous.map((payment) =>
        payment.idPago === idPago ? { ...payment, estado: 'fallido' } : payment,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          Los pagos mostrados usan datos de desarrollo (
          <code>features/events/payments/fixtures</code>), no información real. Calcular
          pagos o registrar una transferencia aquí no envía ninguna solicitud, no conecta
          con ningún banco y no se conserva al recargar la página.
        </Text>
      </Alert>

      <EventPaymentsContent
        evento={evento}
        isLoading={false}
        readiness={readiness}
        payments={payments}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
        onMarkPaid={handleMarkPaid}
        onMarkFailed={handleMarkFailed}
      />
    </div>
  )
}
