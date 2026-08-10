import {
  PAYMENT_FILTER_OPTIONS,
  type PaymentFilterValue,
} from '@/features/events/payments/utils/paymentsPresentation'
import { FormField, Select } from '@/shared/components'

export interface EventPaymentsFilterProps {
  value: PaymentFilterValue
  onChange: (value: PaymentFilterValue) => void
}

/**
 * A local, client-side presentation filter only — no request is ever
 * sent. Mirrors `GET /eventos/{id}/pagos`'s optional `estado` query
 * parameter conceptually (documented as a future live-query capability),
 * but does not call it.
 */
export function EventPaymentsFilter({ value, onChange }: EventPaymentsFilterProps) {
  return (
    <FormField label="Filtrar por estado" className="max-w-xs">
      {(controlProps) => (
        <Select
          {...controlProps}
          value={value}
          onChange={(event) => onChange(event.target.value as PaymentFilterValue)}
        >
          {PAYMENT_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  )
}
