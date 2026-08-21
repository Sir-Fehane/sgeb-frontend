import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventPaymentViewModel } from '@/features/events/payments/types/payments'
import { formatPaymentAmount } from '@/features/events/payments/utils/paymentsFormatting'
import { Text } from '@/shared/components'

export interface EventPaymentsSummarySectionProps {
  payments: readonly EventPaymentViewModel[]
}

/**
 * Computed purely from the real, live payments list this page already
 * fetches (`GET /eventos/{id}/pagos`) — never `GET /eventos/{id}/dashboard`
 * (which, as of feature/operations-and-reports-live, has no payment
 * section at all — see `features/events/dashboard`'s own module comment),
 * no polling, no Socket.IO. `total` is a
 * presentation-only sum of every non-cancelled row's already-provided
 * `monto` (never a frontend calculation of what a payment *should* be —
 * the server owns that), always recomputed from the CURRENT list so it
 * stays correct after any individual mark-paid/mark-failed action, not
 * just frozen at the last calculation call.
 *
 * Labeled "Monto vigente," not "Monto total," because `cancelado` rows
 * are excluded from the sum — "vigente" (already this repo's word for
 * "currently in effect," e.g. "CLABE vigente") accurately names a
 * non-cancelled subtotal, where "total" would imply every record. This
 * is a distinct metric from `/pagos/calcular`'s response `total` field
 * (the server's per-calculation figure, never rendered on this screen —
 * see `types/payments.ts`).
 */
export function EventPaymentsSummarySection({
  payments,
}: EventPaymentsSummarySectionProps) {
  const total = payments
    .filter((payment) => payment.estado !== 'cancelado')
    .reduce((sum, payment) => sum + payment.monto, 0)
  const pendienteTotal = payments.filter(
    (payment) => payment.estado === 'pendiente',
  ).length
  const pagadoTotal = payments.filter((payment) => payment.estado === 'pagado').length
  const fallidoTotal = payments.filter((payment) => payment.estado === 'fallido').length
  const canceladoTotal = payments.filter(
    (payment) => payment.estado === 'cancelado',
  ).length

  return (
    <EventDetailSection title="Resumen de pagos">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Pagos registrados
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {payments.length}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Monto vigente</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {formatPaymentAmount(total)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Pendientes</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {pendienteTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Pagados</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {pagadoTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Fallidos</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {fallidoTotal}
          </dd>
        </div>
        {canceladoTotal > 0 ? (
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-caption text-muted-foreground">Cancelados</dt>
            <dd className="font-heading text-heading text-foreground font-semibold">
              {canceladoTotal}
            </dd>
          </div>
        ) : null}
      </dl>
      {payments.length === 0 ? (
        <Text size="sm" className="text-muted-foreground mt-4">
          Aún no se han calculado pagos para este evento.
        </Text>
      ) : null}
    </EventDetailSection>
  )
}
