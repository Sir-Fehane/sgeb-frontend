import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { accountQueryKeys } from '@/features/account/queries/accountQueryKeys'
import { useRegistrarMisDatosBancariosMutation } from '@/features/account/queries/useRegistrarMisDatosBancariosMutation'
import type { DatosBancariosApiRecord } from '@/features/account/services/usuariosApi'
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

const REQUEST = {
  clabe: '012345678901234567',
  banco: 'BBVA',
  titularCuenta: 'Ana Torres',
}

describe('useRegistrarMisDatosBancariosMutation', () => {
  it('POSTs /usuarios/me/datos-bancarios with exactly the given request', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useRegistrarMisDatosBancariosMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/me/datos-bancarios',
      method: 'POST',
      data: REQUEST,
    })
  })

  it('invalidates the mis-datos-bancarios query on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRegistrarMisDatosBancariosMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: accountQueryKeys.misDatosBancarios(),
    })
  })

  it('is never retried, regardless of outcome', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new Error('network down'))
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useRegistrarMisDatosBancariosMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
