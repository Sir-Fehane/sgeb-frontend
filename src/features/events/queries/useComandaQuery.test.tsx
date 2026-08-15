import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useComandaQuery } from '@/features/events/queries/useComandaQuery'
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

describe('useComandaQuery', () => {
  it('requests GET /eventos/{id}/comanda and resolves the mapped metadata, without url/expira_en', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_comanda: 7,
        id_evento: 1001,
        nombre_original: 'XV de María.pdf',
        tipo_mime: 'application/pdf',
        tamano_bytes: 512_000,
        activo: true,
        creado_en: '2026-09-01T10:00:00Z',
        url: 'https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf',
        expira_en: '2026-09-01T10:15:00Z',
      },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useComandaQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/comanda' }),
    )
    expect(result.current.data).toEqual({
      idComanda: 7,
      nombreOriginal: 'XV de María.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 512_000,
      activo: true,
      creadoEn: '2026-09-01T10:00:00Z',
    })
    expect(result.current.data).not.toHaveProperty('url')
  })

  it('skips the request entirely when idEvento is null', () => {
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useComandaQuery(null), {
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

    const { result } = renderHook(() => useComandaQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
    expect(requestSgeb).toHaveBeenCalledTimes(3)
  })

  it('never retries SGEB-3001 (no active comanda) — a deterministic empty state, not a transient failure', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(404, { code: 'SGEB-3001', message: 'No encontrado.' }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useComandaQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
