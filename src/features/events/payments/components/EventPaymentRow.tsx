import { useState } from 'react'

import { EventPaymentMarkFailedForm } from '@/features/events/payments/components/EventPaymentMarkFailedForm'
import { EventPaymentMarkPaidForm } from '@/features/events/payments/components/EventPaymentMarkPaidForm'
import type { MarkFailedFormValues } from '@/features/events/payments/schemas/markFailedSchema'
import type { MarkPaidFormValues } from '@/features/events/payments/schemas/markPaidSchema'
import type {
  EventPaymentViewModel,
  MarkFailedRequest,
  MarkPaidRequest,
} from '@/features/events/payments/types/payments'
import {
  formatPaymentAmount,
  formatPaymentDate,
} from '@/features/events/payments/utils/paymentsFormatting'
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from '@/features/events/payments/utils/paymentsPresentation'
import { Alert, Badge, Button, Text } from '@/shared/components'

export interface EventPaymentRowProps {
  payment: EventPaymentViewModel
  onMarkPaid: (request: MarkPaidRequest) => Promise<void>
  onMarkFailed: (request: MarkFailedRequest) => Promise<void>
}

const CELL_CLASSES = 'px-3 py-3 font-sans text-body-sm align-top'

type ActiveAction = 'paid' | 'failed' | null

/**
 * Only a `pendiente` payment ever exposes an action, and only these two —
 * mapping exactly to `PATCH /pagos/{id}/pagado` and
 * `PATCH /pagos/{id}/fallido`. `pagado` is terminal (no action);
 * `fallido` communicates that the documented recovery is a page-level
 * recalculation, never a direct "mark as paid" shortcut (not
 * authoritatively confirmed as a valid transition); `cancelado` is
 * display-only (no documented endpoint produces or reverses it).
 */
export function EventPaymentRow({
  payment,
  onMarkPaid,
  onMarkFailed,
}: EventPaymentRowProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleMarkPaid(values: MarkPaidFormValues) {
    setIsSubmitting(true)
    setActionError(null)
    try {
      await onMarkPaid({ idPago: payment.idPago, referencia: values.referencia })
      setActiveAction(null)
    } catch {
      setActionError('No pudimos registrar la transferencia. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleMarkFailed(values: MarkFailedFormValues) {
    setIsSubmitting(true)
    setActionError(null)
    try {
      await onMarkFailed({ idPago: payment.idPago, motivo: values.motivo })
      setActiveAction(null)
    } catch {
      setActionError('No pudimos registrar el resultado. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <tr className="border-border border-b last:border-0">
      <td className={CELL_CLASSES}>{payment.nombre}</td>
      <td className={CELL_CLASSES}>{payment.clabeDestinoEnmascarada}</td>
      <td className={CELL_CLASSES}>{formatPaymentAmount(payment.monto)}</td>
      <td className={CELL_CLASSES}>
        <Badge tone={PAYMENT_STATUS_TONES[payment.estado]}>
          {PAYMENT_STATUS_LABELS[payment.estado]}
        </Badge>
      </td>
      <td className={CELL_CLASSES}>
        {payment.referencia ? <Text size="sm">{payment.referencia}</Text> : null}
        {payment.fechaPago ? (
          <Text size="sm" className="text-muted-foreground">
            <time dateTime={payment.fechaPago}>
              {formatPaymentDate(payment.fechaPago)}
            </time>
          </Text>
        ) : null}
      </td>
      <td className={CELL_CLASSES}>
        {payment.estado === 'pendiente' && activeAction === null ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              aria-label={`Registrar transferencia realizada de ${payment.nombre}`}
              onClick={() => setActiveAction('paid')}
            >
              Registrar transferencia realizada
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Registrar transferencia rechazada de ${payment.nombre}`}
              onClick={() => setActiveAction('failed')}
            >
              Registrar transferencia rechazada
            </Button>
          </div>
        ) : null}

        {payment.estado === 'pendiente' && activeAction === 'paid' ? (
          <EventPaymentMarkPaidForm
            onSubmit={handleMarkPaid}
            onCancel={() => setActiveAction(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}

        {payment.estado === 'pendiente' && activeAction === 'failed' ? (
          <EventPaymentMarkFailedForm
            onSubmit={handleMarkFailed}
            onCancel={() => setActiveAction(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}

        {payment.estado === 'fallido' ? (
          <Text size="sm" className="text-muted-foreground">
            Se recalculará en el próximo cálculo de pagos.
          </Text>
        ) : null}

        {actionError ? (
          <Alert tone="danger" className="mt-2">
            {actionError}
          </Alert>
        ) : null}
      </td>
    </tr>
  )
}
