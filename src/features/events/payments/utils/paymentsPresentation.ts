import type { PaymentStatus } from '@/features/events/payments/types/payments'
import type { Tone } from '@/shared/components'

/**
 * Safe Spanish labels for `Pago.estado`'s documented enum. A display
 * decision this feature owns, per docs/FrontendArchitecture.md §11.
 * Tone alone never carries the meaning — every render site also shows
 * the text label.
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  fallido: 'Fallido',
  cancelado: 'Cancelado',
}

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, Tone> = {
  pendiente: 'neutral',
  pagado: 'success',
  fallido: 'warning',
  cancelado: 'neutral',
}

/**
 * The local presentation filter this screen offers (`Todos` plus the four
 * documented `estado` values) — mirrors `GET /eventos/{id}/pagos`'s
 * optional `estado` query parameter, but is applied client-side only in
 * this fixture-backed foundation; no request is ever sent.
 */
export const PAYMENT_FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'pagado', label: 'Pagados' },
  { value: 'fallido', label: 'Fallidos' },
  { value: 'cancelado', label: 'Cancelados' },
] as const

export type PaymentFilterValue = (typeof PAYMENT_FILTER_OPTIONS)[number]['value']
