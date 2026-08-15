import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { comandaQueryKeys } from '@/features/events/queries/comandaQueryKeys'
import { useRetireComandaMutation } from '@/features/events/queries/useRetireComandaMutation'
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

describe('useRetireComandaMutation', () => {
  it('DELETEs the exact endpoint', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useRetireComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/comanda',
      method: 'DELETE',
    })
  })

  it('invalidates the comanda metadata query for this event on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRetireComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: comandaQueryKeys.detail(1001),
    })
  })

  it('does not invalidate and is not automatically retried on a real error', async () => {
    const error = new SgebApplicationError(403, {
      code: 'SGEB-1004',
      message: 'No tienes permisos.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRetireComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(requestSgeb).toHaveBeenCalledOnce()
  })
})
