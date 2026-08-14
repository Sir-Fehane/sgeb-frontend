import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 1,
  titulo: 'Boda García',
  tipo: 'social',
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  radio_geocerca_m: 150,
  estado: 'publicado',
  creado_en: '2026-07-01T09:00:00',
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useEventDetailQuery', () => {
  it('requests GET /eventos/{id} for the given id and maps the response', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })

    const { result } = renderHook(() => useEventDetailQuery(1001), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001' }),
    )
    expect(result.current.data?.idEvento).toBe(1001)
    expect(result.current.data?.titulo).toBe('Boda García')
  })

  it('never calls the transport when idEvento is null (skipped query)', () => {
    const { result } = renderHook(() => useEventDetailQuery(null), {
      wrapper: createWrapper(),
    })

    expect(requestSgeb).not.toHaveBeenCalled()
    expect(result.current.status).toBe('pending')
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('uses a detail query key that never collides with the list query key', () => {
    const detailKey = eventsQueryKeys.detail(1001)
    const listKey = eventsQueryKeys.list({})
    expect(detailKey).not.toEqual(listKey)
    expect(eventsQueryKeys.detail(1001)).toEqual(detailKey)
    expect(eventsQueryKeys.detail(1002)).not.toEqual(detailKey)
  })

  it('surfaces a SgebApplicationError (e.g. SGEB-3001) without retrying', async () => {
    const error = new SgebApplicationError(404, {
      code: 'SGEB-3001',
      message: 'No encontramos la información solicitada.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    const { result } = renderHook(() => useEventDetailQuery(999999), {
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

    const { result } = renderHook(() => useEventDetailQuery(1001), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(vi.mocked(requestSgeb).mock.calls.length).toBeGreaterThan(1)
  })

  it('propagates an AbortSignal to the transport', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })

    renderHook(() => useEventDetailQuery(1001), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalled()
    })
    const config = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(config.signal).toBeInstanceOf(AbortSignal)
  })
})
