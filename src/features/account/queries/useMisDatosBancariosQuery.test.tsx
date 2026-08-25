import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMisDatosBancariosQuery } from '@/features/account/queries/useMisDatosBancariosQuery'
import type { DatosBancariosApiRecord } from '@/features/account/services/usuariosApi'
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

const RECORD: DatosBancariosApiRecord = {
  id_datos: 1,
  clabe: '0123…5678',
  banco: 'BBVA',
  titular_cuenta: 'Ana Torres',
  activo: true,
}

describe('useMisDatosBancariosQuery', () => {
  it('requests GET /usuarios/me/datos-bancarios and resolves the mapped record', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMisDatosBancariosQuery(true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/me/datos-bancarios' }),
    )
    expect(result.current.data).toEqual({
      idDatos: 1,
      clabeEnmascarada: '0123…5678',
      banco: 'BBVA',
      titularCuenta: 'Ana Torres',
      activo: true,
    })
  })

  it('never retries the SGEB-3001 "not registered" outcome', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(404, {
        code: 'SGEB-3001',
        message: 'No encontramos la información solicitada.',
      }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMisDatosBancariosQuery(true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })

  it('retries a SgebNetworkError up to the bounded limit', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new SgebNetworkError('sin conexión'))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    })

    const { result } = renderHook(() => useMisDatosBancariosQuery(true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
    expect(requestSgeb).toHaveBeenCalledTimes(3)
  })

  it('never fires the request when enabled is false', () => {
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMisDatosBancariosQuery(false), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
    expect(requestSgeb).not.toHaveBeenCalled()
  })
})
