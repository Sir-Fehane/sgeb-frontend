import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { useChangeEventoEstadoMutation } from '@/features/events/queries/useChangeEventoEstadoMutation'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
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

describe('useChangeEventoEstadoMutation', () => {
  it('PATCHes /eventos/{id}/estado with exactly { estado } for the requested transition', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...RECORD, estado: 'en_curso' },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useChangeEventoEstadoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate('en_curso')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/estado',
      method: 'PATCH',
      data: { estado: 'en_curso' },
    })
  })

  it('invalidates event detail and the events list on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...RECORD, estado: 'cancelado' },
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useChangeEventoEstadoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate('cancelado')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventsQueryKeys.detail(1001) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventsQueryKeys.lists() })
  })

  it('never writes an optimistic result — cache data is untouched, only invalidated', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...RECORD, estado: 'cancelado' },
    })
    const queryClient = new QueryClient()
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData')

    const { result } = renderHook(() => useChangeEventoEstadoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate('cancelado')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(setQueryDataSpy).not.toHaveBeenCalled()
  })

  it('is not retried on failure (e.g. SGEB-4013 sin mesas), and surfaces the real error', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'Este evento no tiene mesas registradas.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useChangeEventoEstadoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate('publicado')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe(error)
  })
})
