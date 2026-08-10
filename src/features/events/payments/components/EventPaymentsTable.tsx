import { EventPaymentRow } from '@/features/events/payments/components/EventPaymentRow'
import type {
  EventPaymentViewModel,
  MarkFailedRequest,
  MarkPaidRequest,
} from '@/features/events/payments/types/payments'
import { Text } from '@/shared/components'

export interface EventPaymentsTableProps {
  payments: readonly EventPaymentViewModel[]
  onMarkPaid: (request: MarkPaidRequest) => Promise<void>
  onMarkFailed: (request: MarkFailedRequest) => Promise<void>
}

const HEADER_CLASSES =
  'px-3 py-2 text-left font-sans text-label font-semibold text-muted-foreground'

/**
 * Semantic table — real `<th scope="col">` headers, one DOM
 * representation at every width (scrolls horizontally inside its own
 * container rather than a separate mobile card layout), same established
 * pattern as `features/reports/components/WaiterPerformanceTable.tsx`.
 * Never renders `idPago`/`idParticipacion` as visible content, and never
 * renders anything but the documented masked `clabeDestinoEnmascarada`.
 */
export function EventPaymentsTable({
  payments,
  onMarkPaid,
  onMarkFailed,
}: EventPaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        No hay pagos que coincidan con este filtro.
      </Text>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="sr-only">Pagos del evento</caption>
        <thead>
          <tr className="border-border border-b">
            <th scope="col" className={HEADER_CLASSES}>
              Mesero
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              CLABE destino
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Monto
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Estado
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Referencia / fecha
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <EventPaymentRow
              key={payment.idPago}
              payment={payment}
              onMarkPaid={onMarkPaid}
              onMarkFailed={onMarkFailed}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
