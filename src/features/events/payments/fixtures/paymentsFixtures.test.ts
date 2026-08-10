import { describe, expect, it } from 'vitest'

import {
  calculatePaymentsResult,
  findEventPayments,
} from '@/features/events/payments/fixtures/paymentsFixtures'

const EIGHTEEN_DIGIT_PATTERN = /\d{18}/

describe('findEventPayments', () => {
  it('event 3001 has one row of each documented estado', () => {
    const payments = findEventPayments(3001)
    const states = payments.map((payment) => payment.estado).sort()

    expect(states).toEqual(['cancelado', 'fallido', 'pagado', 'pendiente'])
  })

  it('events 1001 and 2001 (closure not ready) have zero payment rows', () => {
    expect(findEventPayments(1001)).toEqual([])
    expect(findEventPayments(2001)).toEqual([])
  })

  it('returns an empty list for an event with no fixture data at all', () => {
    expect(findEventPayments(999999)).toEqual([])
  })

  it('never exposes a raw 18-digit CLABE', () => {
    for (const idEvento of [1001, 2001, 3001]) {
      for (const payment of findEventPayments(idEvento)) {
        expect(payment.clabeDestinoEnmascarada).not.toMatch(EIGHTEEN_DIGIT_PATTERN)
        expect(payment.clabeDestinoEnmascarada).toContain('…')
      }
    }
  })

  it('the pagado row has a referencia and fechaPago; every other row has neither', () => {
    const payments = findEventPayments(3001)

    for (const payment of payments) {
      if (payment.estado === 'pagado') {
        expect(payment.referencia).not.toBeNull()
        expect(payment.fechaPago).not.toBeNull()
      } else {
        expect(payment.referencia).toBeNull()
        expect(payment.fechaPago).toBeNull()
      }
    }
  })

  it('never includes a persisted motivo/motivo_fallo field on any row', () => {
    for (const payment of findEventPayments(3001)) {
      expect(payment).not.toHaveProperty('motivo')
      expect(payment).not.toHaveProperty('motivo_fallo')
      expect(payment).not.toHaveProperty('motivoFallo')
    }
  })
})

describe('calculatePaymentsResult', () => {
  it('accepts only idEvento — it has no parameter for the current in-memory payments list', () => {
    expect(calculatePaymentsResult.length).toBe(1)
  })

  it('is deterministic: the same event id always returns an equal result, proving nothing external is read', () => {
    expect(calculatePaymentsResult(3001)).toEqual(calculatePaymentsResult(3001))
  })

  it('the pagado row (idPago 2) is authored identically to its pre-calculation counterpart', () => {
    const beforeCalculation = findEventPayments(3001).find(
      (payment) => payment.estado === 'pagado',
    )
    const afterCalculation = calculatePaymentsResult(3001).pagos.find(
      (payment) => payment.idPago === beforeCalculation?.idPago,
    )

    expect(afterCalculation).toEqual(beforeCalculation)
  })

  it('the cancelado row (idPago 4) is authored unchanged', () => {
    const result = calculatePaymentsResult(3001)
    const cancelado = result.pagos.find((payment) => payment.idPago === 4)

    expect(cancelado?.estado).toBe('cancelado')
  })

  it('the fallido row (idPago 3) is pre-authored in its post-recalculation pendiente shape', () => {
    const result = calculatePaymentsResult(3001)
    const refreshed = result.pagos.find((payment) => payment.idPago === 3)

    expect(refreshed?.estado).toBe('pendiente')
    expect(refreshed?.referencia).toBeNull()
    expect(refreshed?.fechaPago).toBeNull()
  })

  it('total and yaPagados are pre-authored fixture values matching the recorded pagos', () => {
    const result = calculatePaymentsResult(3001)

    expect(result.total).toBe(1320)
    expect(result.yaPagados).toBe(1)
  })

  it('returns an empty result for an event with no calculation fixture', () => {
    const result = calculatePaymentsResult(999999)
    expect(result).toEqual({ pagos: [], total: 0, yaPagados: 0 })
  })
})
