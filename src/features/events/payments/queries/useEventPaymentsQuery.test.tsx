import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useEventPaymentsQuery } from '@/features/events/payments/queries/useEventPaymentsQuery'
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

describe('useEventPaymentsQuery', () => {
  it('requests GET /eventos/{id}/pagos and resolves the mapped list', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        {
          id_pago: 1,
          id_participacion: 9001,
          monto: 850,
          clabe_destino: '0121…8909',
          estado: 'pendiente',
          referencia: null,
          fecha_pago: null,
        },
      ],
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useEventPaymentsQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/pagos' }),
    )
    expect(result.current.data).toEqual([
      {
        idPago: 1,
        idParticipacion: 9001,
        monto: 850,
        clabeDestinoEnmascarada: '0121…8909',
        estado: 'pendiente',
        referencia: null,
        fechaPago: null,
      },
    ])
  })

  it('skips the request entirely when idEvento is null', () => {
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useEventPaymentsQuery(null), {
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

    const { result } = renderHook(() => useEventPaymentsQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
    expect(requestSgeb).toHaveBeenCalledTimes(3)
  })

  it('never retries a SgebApplicationError', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(500, {
        code: 'SGEB-5000',
        message: 'Error inesperado.',
      }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useEventPaymentsQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
