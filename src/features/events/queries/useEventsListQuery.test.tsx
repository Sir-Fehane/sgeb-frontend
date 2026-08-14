import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { useEventsListQuery } from '@/features/events/queries/useEventsListQuery'
import { DEFAULT_EVENTS_FILTER_STATE } from '@/features/events/types/event'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useEventsListQuery', () => {
  it('requests /eventos with no params at the default filter state (idSalon excluded)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    const { result } = renderHook(() => useEventsListQuery(DEFAULT_EVENTS_FILTER_STATE), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos', params: {} }),
    )
    expect(result.current.data).toEqual([])
  })

  it('sends estado/fechaDesde/fechaHasta but never idSalon, even when idSalon is set', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    const { result } = renderHook(
      () =>
        useEventsListQuery({
          estado: 'publicado',
          fechaDesde: '2026-08-01',
          fechaHasta: '2026-08-31',
          idSalon: 3,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const params = vi.mocked(requestSgeb).mock.calls[0]![0].params!
    expect(params).toEqual({
      estado: 'publicado',
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
    })
    expect(params).not.toHaveProperty('idSalon')
    expect(params).not.toHaveProperty('id_salon')
  })

  it('changing a server-bound filter produces a different, deterministic query key', () => {
    const base = eventsQueryKeys.list({ estado: 'publicado' })
    const changed = eventsQueryKeys.list({ estado: 'cancelado' })
    expect(base).not.toEqual(changed)
    expect(eventsQueryKeys.list({ estado: 'publicado' })).toEqual(base)
  })

  it('surfaces a SgebApplicationError without retrying', async () => {
    const error = new SgebApplicationError(400, {
      code: 'SGEB-2009',
      message: 'Rango inválido.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    const { result } = renderHook(() => useEventsListQuery(DEFAULT_EVENTS_FILTER_STATE), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe(error)
  })

  it('retries a SgebNetworkError up to the bounded limit', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new SgebNetworkError('Sin conexión.'))

    function Wrapper({ children }: { children: ReactNode }) {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retryDelay: 0 } },
      })
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useEventsListQuery(DEFAULT_EVENTS_FILTER_STATE), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(vi.mocked(requestSgeb).mock.calls.length).toBeGreaterThan(1)
  })
})
