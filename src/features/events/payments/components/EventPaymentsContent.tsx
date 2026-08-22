import { useState } from 'react'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import type { EventClosureReadinessViewModel } from '@/features/events/closure/types/closure'
import { EventPaymentsBlockedSection } from '@/features/events/payments/components/EventPaymentsBlockedSection'
import { EventPaymentsCalculateSection } from '@/features/events/payments/components/EventPaymentsCalculateSection'
import { EventPaymentsErrorState } from '@/features/events/payments/components/EventPaymentsErrorState'
import { EventPaymentsFilter } from '@/features/events/payments/components/EventPaymentsFilter'
import { EventPaymentsHeader } from '@/features/events/payments/components/EventPaymentsHeader'
import { EventPaymentsLoadingState } from '@/features/events/payments/components/EventPaymentsLoadingState'
import { EventPaymentsSummarySection } from '@/features/events/payments/components/EventPaymentsSummarySection'
import { EventPaymentsTable } from '@/features/events/payments/components/EventPaymentsTable'
import type {
  EventPaymentViewModel,
  MarkFailedRequest,
  MarkPaidRequest,
} from '@/features/events/payments/types/payments'
import type { PaymentFilterValue } from '@/features/events/payments/utils/paymentsPresentation'
import type { EventDetailViewModel } from '@/features/events/types/event'

export interface EventPaymentsContentProps {
  /** `null` means "not found" — a real `SGEB-3001` 404 or a malformed route id, not a loading gap. Reuses `EventDetailUnavailableState`. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  /** `null` means no closure diagnostic exists for this event — treated the same as unavailable, same convention as Closure. */
  readiness: EventClosureReadinessViewModel | null
  payments: readonly EventPaymentViewModel[]
  onCalculate: () => Promise<void>
  isCalculating?: boolean
  onMarkPaid: (request: MarkPaidRequest) => Promise<void>
  onMarkFailed: (request: MarkFailedRequest) => Promise<void>
}

/**
 * The reusable presentational composition — header + (blocked notice OR
 * summary + calculate + filterable table), or exactly one of loading /
 * error / unavailable, selected purely from props. No bank/gateway
 * integration, no bulk `/pagos/aprobar`, no payment-amount formula
 * anywhere in this composition — see this feature's README.
 */
export function EventPaymentsContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  readiness,
  payments,
  onCalculate,
  isCalculating = false,
  onMarkPaid,
  onMarkFailed,
}: EventPaymentsContentProps) {
  const [filter, setFilter] = useState<PaymentFilterValue>('todos')

  if (isLoading) {
    return <EventPaymentsLoadingState />
  }

  if (errorMessage) {
    return <EventPaymentsErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento || !readiness) {
    return <EventDetailUnavailableState />
  }

  const filteredPayments = payments.filter(
    (payment) => filter === 'todos' || payment.estado === filter,
  )

  return (
    <div className="flex flex-col gap-6">
      <EventPaymentsHeader idEvento={evento.idEvento} tituloEvento={evento.titulo} />

      {readiness.listo ? (
        <>
          <EventPaymentsSummarySection payments={payments} />
          <EventPaymentsCalculateSection
            hasPayments={payments.length > 0}
            onCalculate={onCalculate}
            isCalculating={isCalculating}
          />
          <EventDetailSection title="Lista de pagos">
            <div className="flex flex-col gap-4">
              <EventPaymentsFilter value={filter} onChange={setFilter} />
              <EventPaymentsTable
                payments={filteredPayments}
                onMarkPaid={onMarkPaid}
                onMarkFailed={onMarkFailed}
              />
            </div>
          </EventDetailSection>
        </>
      ) : (
        <EventPaymentsBlockedSection readiness={readiness} />
      )}
    </div>
  )
}
