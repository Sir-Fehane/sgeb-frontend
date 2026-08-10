import { describe, expect, it } from 'vitest'

import {
  PAYMENT_FILTER_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from '@/features/events/payments/utils/paymentsPresentation'

describe('PAYMENT_STATUS_LABELS', () => {
  it('maps exactly the four documented payment states — nothing invented', () => {
    expect(Object.keys(PAYMENT_STATUS_LABELS).sort()).toEqual(
      ['cancelado', 'fallido', 'pagado', 'pendiente'].sort(),
    )
  })

  it('gives every state a safe, non-empty Spanish label', () => {
    expect(PAYMENT_STATUS_LABELS.pendiente).toBe('Pendiente')
    expect(PAYMENT_STATUS_LABELS.pagado).toBe('Pagado')
    expect(PAYMENT_STATUS_LABELS.fallido).toBe('Fallido')
    expect(PAYMENT_STATUS_LABELS.cancelado).toBe('Cancelado')
  })
})

describe('PAYMENT_STATUS_TONES', () => {
  it('gives every state a tone, text never relying on color alone', () => {
    expect(PAYMENT_STATUS_TONES.pendiente).toBeDefined()
    expect(PAYMENT_STATUS_TONES.pagado).toBeDefined()
    expect(PAYMENT_STATUS_TONES.fallido).toBeDefined()
    expect(PAYMENT_STATUS_TONES.cancelado).toBeDefined()
  })

  it('gives pagado the success tone', () => {
    expect(PAYMENT_STATUS_TONES.pagado).toBe('success')
  })
})

describe('PAYMENT_FILTER_OPTIONS', () => {
  it('offers exactly Todos plus the four documented states — no invented filter value', () => {
    expect(PAYMENT_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      'todos',
      'pendiente',
      'pagado',
      'fallido',
      'cancelado',
    ])
  })
})
