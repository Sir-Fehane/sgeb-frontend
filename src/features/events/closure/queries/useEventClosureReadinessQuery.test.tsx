import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useEventClosureReadinessQuery } from '@/features/events/closure/queries/useEventClosureReadinessQuery'
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

describe('useEventClosureReadinessQuery', () => {
  it('requests GET /eventos/{id}/cierre and resolves the mapped view model', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        evento_finalizado: true,
        participaciones_total: 5,
        participaciones_sin_salida: 0,
        meseros_sin_clabe_vigente: 0,
        listo: true,
      },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useEventClosureReadinessQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/cierre' }),
    )
    expect(result.current.data).toEqual({
      eventoFinalizado: true,
      participacionesTotal: 5,
      participacionesSinSalida: 0,
      meserosSinClabeVigente: 0,
      listo: true,
    })
  })

  it('skips the request entirely when idEvento is null', () => {
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useEventClosureReadinessQuery(null), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('retries a SgebNetworkError up to the bounded limit', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new SgebNetworkError('sin conexión'))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    })

    const { result } = renderHook(() => useEventClosureReadinessQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
    // Initial attempt + 2 bounded retries = 3 calls.
    expect(requestSgeb).toHaveBeenCalledTimes(3)
  })

  it('never retries a SgebApplicationError (e.g. SGEB-3001 not found)', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(404, {
        code: 'SGEB-3001',
        message: 'No encontramos la información solicitada.',
      }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useEventClosureReadinessQuery(999999), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
