import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { paymentsQueryKeys } from '@/features/events/payments/queries/paymentsQueryKeys'
import { useMarkPaymentFailedMutation } from '@/features/events/payments/queries/useMarkPaymentFailedMutation'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
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

describe('useMarkPaymentFailedMutation', () => {
  it('PATCHes /pagos/{id}/fallido with exactly idPago and motivo', async () => {
    const error = new SgebApplicationError(500, {
      code: 'SGEB-5004',
      message: 'No pudimos registrar la transferencia. Se reintentará.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMarkPaymentFailedMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, motivo: 'Cuenta bancaria cerrada' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/pagos/1/fallido',
      method: 'PATCH',
      data: { motivo: 'Cuenta bancaria cerrada' },
    })
  })

  it('invalidates the payments list on the documented always-error SGEB-5004 outcome (the record WAS persisted)', async () => {
    const error = new SgebApplicationError(500, {
      code: 'SGEB-5004',
      message: 'No pudimos registrar la transferencia. Se reintentará.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkPaymentFailedMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, motivo: 'Cuenta bancaria cerrada' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paymentsQueryKeys.list(1001) })
  })

  it('does NOT invalidate on a real failure (e.g. a network error, nothing new to refetch)', async () => {
    const error = new SgebNetworkError('sin conexión')
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkPaymentFailedMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, motivo: 'Cuenta bancaria cerrada' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('does NOT invalidate on a real business conflict (e.g. SGEB-4011 already paid)', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message: 'Esta acción no está permitida en el estado actual.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkPaymentFailedMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, motivo: 'Cuenta bancaria cerrada' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('is never retried, regardless of outcome', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new SgebNetworkError('sin conexión'))
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMarkPaymentFailedMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idPago: 1, motivo: 'Cuenta bancaria cerrada' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
