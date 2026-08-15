import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { paymentsQueryKeys } from '@/features/events/payments/queries/paymentsQueryKeys'
import { useCalculateEventPaymentsMutation } from '@/features/events/payments/queries/useCalculateEventPaymentsMutation'
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

describe('useCalculateEventPaymentsMutation', () => {
  it('POSTs /eventos/{id}/pagos/calcular with no body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'calculado' },
      data: { pagos: [], total: 850, ya_pagados: 0 },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCalculateEventPaymentsMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/pagos/calcular',
      method: 'POST',
    })
  })

  it('invalidates the payments list for this event on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'calculado' },
      data: { pagos: [], total: 850, ya_pagados: 0 },
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCalculateEventPaymentsMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paymentsQueryKeys.list(1001) })
  })

  it('surfaces a SgebApplicationError (e.g. SGEB-4013 evento no finalizado) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'El evento aún no está en la etapa necesaria para esta operación.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCalculateEventPaymentsMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('is not retried on failure', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(409, { code: 'SGEB-4013', message: 'x' }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCalculateEventPaymentsMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
