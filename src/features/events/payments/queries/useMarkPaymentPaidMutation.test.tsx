import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { paymentsQueryKeys } from '@/features/events/payments/queries/paymentsQueryKeys'
import { useMarkPaymentPaidMutation } from '@/features/events/payments/queries/useMarkPaymentPaidMutation'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const PAGADO_RECORD = {
  id_pago: 1,
  id_participacion: 9001,
  monto: 850,
  clabe_destino: '0121…8909',
  estado: 'pagado',
  referencia: 'REF-001',
  fecha_pago: '2026-08-10T20:00:00Z',
}

describe('useMarkPaymentPaidMutation', () => {
  it('PATCHes /pagos/{id}/pagado with exactly idPago and referencia', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: PAGADO_RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMarkPaymentPaidMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, referencia: 'REF-001' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/pagos/1/pagado',
      method: 'PATCH',
      data: { referencia: 'REF-001' },
    })
  })

  it('invalidates the payments list for this event on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: PAGADO_RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkPaymentPaidMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, referencia: 'REF-001' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paymentsQueryKeys.list(1001) })
  })

  it('surfaces a SgebApplicationError (e.g. SGEB-4011 already paid) without invalidating and without retry', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message: 'Esta acción no está permitida en el estado actual.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkPaymentPaidMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, referencia: 'REF-001' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
