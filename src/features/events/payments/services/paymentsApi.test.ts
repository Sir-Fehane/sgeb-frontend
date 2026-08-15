import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateEventPayments,
  fetchEventPayments,
  isPaymentFallidoRecorded,
  markPaymentFailed,
  markPaymentPaid,
  type PagoApiRecord,
} from '@/features/events/payments/services/paymentsApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const PAGO_RECORD: PagoApiRecord = {
  id_pago: 1,
  id_participacion: 9001,
  monto: 850,
  clabe_destino: '0121…8909',
  estado: 'pendiente',
  referencia: null,
  fecha_pago: null,
}

const PAGO_PAGADO_RECORD: PagoApiRecord = {
  id_pago: 2,
  id_participacion: 9002,
  monto: 850,
  clabe_destino: '0121…8909',
  estado: 'pagado',
  referencia: 'REF-001',
  fecha_pago: '2026-08-10T20:00:00Z',
}

describe('fetchEventPayments', () => {
  it('requests GET /eventos/{id}/pagos and maps every field, camelCase, CLABE passed through masked', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [PAGO_RECORD, PAGO_PAGADO_RECORD],
    })

    const result = await fetchEventPayments(1001)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/pagos' })
    expect(result).toEqual([
      {
        idPago: 1,
        idParticipacion: 9001,
        monto: 850,
        clabeDestinoEnmascarada: '0121…8909',
        estado: 'pendiente',
        referencia: null,
        fechaPago: null,
      },
      {
        idPago: 2,
        idParticipacion: 9002,
        monto: 850,
        clabeDestinoEnmascarada: '0121…8909',
        estado: 'pagado',
        referencia: 'REF-001',
        fechaPago: '2026-08-10T20:00:00Z',
      },
    ])
  })

  it('propagates the signal', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [],
    })
    const controller = new AbortController()

    await fetchEventPayments(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('returns an empty list when the envelope carries null data (SGEB-0002, no payments yet)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'sin resultados' },
      data: null,
    })

    expect(await fetchEventPayments(1001)).toEqual([])
  })

  it('lets a SgebApplicationError propagate unchanged', async () => {
    const error = new Error('SGEB-3001 not found')
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(fetchEventPayments(999999)).rejects.toBe(error)
  })
})

describe('calculateEventPayments', () => {
  it('POSTs /eventos/{id}/pagos/calcular with no body and maps only total/yaPagados', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'calculado' },
      data: { pagos: [PAGO_RECORD], total: 850, ya_pagados: 0 },
    })

    const result = await calculateEventPayments(1001)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/pagos/calcular',
      method: 'POST',
    })
    expect(result).toEqual({ total: 850, yaPagados: 0 })
  })

  it('throws SgebNetworkError when the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'calculado' },
      data: null,
    })

    await expect(calculateEventPayments(1001)).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('lets a SgebApplicationError (e.g. SGEB-4015 sin salida) propagate unchanged', async () => {
    const error = new Error('SGEB-4015 sin salida')
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(calculateEventPayments(1001)).rejects.toBe(error)
  })
})

describe('markPaymentPaid', () => {
  it('PATCHes /pagos/{id}/pagado with the referencia and maps the updated record', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: PAGO_PAGADO_RECORD,
    })

    const result = await markPaymentPaid(2, 'REF-001')

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/pagos/2/pagado',
      method: 'PATCH',
      data: { referencia: 'REF-001' },
    })
    expect(result.estado).toBe('pagado')
    expect(result.referencia).toBe('REF-001')
  })

  it('throws SgebNetworkError when the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(markPaymentPaid(2, 'REF-001')).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('lets a SgebApplicationError (e.g. SGEB-4011 already paid) propagate unchanged', async () => {
    const error = new Error('SGEB-4011 estado inválido')
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(markPaymentPaid(2, 'REF-001')).rejects.toBe(error)
  })
})

describe('markPaymentFailed', () => {
  it('PATCHes /pagos/{id}/fallido with the motivo', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await markPaymentFailed(1, 'Cuenta bancaria cerrada')

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/pagos/1/fallido',
      method: 'PATCH',
      data: { motivo: 'Cuenta bancaria cerrada' },
    })
  })

  it('lets the documented always-error SGEB-5004 response propagate unchanged, never swallowed here', async () => {
    const error = new SgebApplicationError(500, {
      code: 'SGEB-5004',
      message: 'No pudimos registrar la transferencia. Se reintentará.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(markPaymentFailed(1, 'Cuenta bancaria cerrada')).rejects.toBe(error)
  })
})

describe('isPaymentFallidoRecorded', () => {
  it('is true only for a SgebApplicationError with code SGEB-5004', () => {
    const error = new SgebApplicationError(500, {
      code: 'SGEB-5004',
      message: 'No pudimos registrar la transferencia. Se reintentará.',
    })

    expect(isPaymentFallidoRecorded(error)).toBe(true)
  })

  it('is false for a different SgebApplicationError code (e.g. SGEB-4011 already paid)', () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message: 'Esta acción no está permitida en el estado actual.',
    })

    expect(isPaymentFallidoRecorded(error)).toBe(false)
  })

  it('is false for a SgebNetworkError', () => {
    expect(isPaymentFallidoRecorded(new SgebNetworkError('sin conexión'))).toBe(false)
  })

  it('is false for an unrelated error', () => {
    expect(isPaymentFallidoRecorded(new Error('boom'))).toBe(false)
  })
})
