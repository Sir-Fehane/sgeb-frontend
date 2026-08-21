import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMesaPublicaQuery } from '@/features/public-diner/queries/useMesaPublicaQuery'
import { requestPublic } from '@/shared/api/publicClient'
import type * as PublicClientModule from '@/shared/api/publicClient'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'

vi.mock('@/shared/api/publicClient', async () => {
  const actual = await vi.importActual<typeof PublicClientModule>(
    '@/shared/api/publicClient',
  )
  return { ...actual, requestPublic: vi.fn() }
})

beforeEach(() => {
  vi.mocked(requestPublic).mockReset()
})

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useMesaPublicaQuery', () => {
  it('requests GET /publico/mesas/{codigo_qr} and maps the response to the view model', async () => {
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_mesa: 12,
        etiqueta: 'Mesa 12',
        evento: { id_evento: 1001, titulo: 'Boda García', estado: 'en_curso' },
      },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMesaPublicaQuery('qr-abc'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestPublic).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/publico/mesas/qr-abc', method: 'GET' }),
    )
    expect(result.current.data).toEqual({
      idMesa: 12,
      etiqueta: 'Mesa 12',
      evento: { idEvento: 1001, titulo: 'Boda García', estado: 'en_curso' },
    })
  })

  it('skips the request entirely when codigoQr is null', () => {
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMesaPublicaQuery(null), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(requestPublic).not.toHaveBeenCalled()
  })

  it('retries a SgebNetworkError up to the bounded limit', async () => {
    vi.mocked(requestPublic).mockRejectedValue(new SgebNetworkError('sin conexión'))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    })

    const { result } = renderHook(() => useMesaPublicaQuery('qr-abc'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
    expect(requestPublic).toHaveBeenCalledTimes(3)
  })

  it('never retries a SgebApplicationError (e.g. SGEB-3003 unknown QR)', async () => {
    vi.mocked(requestPublic).mockRejectedValue(
      new SgebApplicationError(404, {
        code: 'SGEB-3003',
        message: 'El código QR escaneado no corresponde a ninguna mesa activa.',
      }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMesaPublicaQuery('unknown-qr'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestPublic).toHaveBeenCalledTimes(1)
  })
})
