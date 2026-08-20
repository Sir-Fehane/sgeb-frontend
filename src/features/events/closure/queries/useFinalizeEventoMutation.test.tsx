import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { useFinalizeEventoMutation } from '@/features/events/closure/queries/useFinalizeEventoMutation'
import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
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

const FINALIZED_RECORD: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 1,
  capitan: {
    uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellido_paterno: 'Prueba',
    apellido_materno: null,
    correo: 'capitan.prueba@example.com',
  },
  titulo: 'Boda García',
  tipo: 'social',
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: '2026-09-13T02:00:00',
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  radio_geocerca_m: 150,
  estado: 'finalizado',
  creado_en: '2026-07-01T09:00:00',
}

describe('useFinalizeEventoMutation', () => {
  it('PATCHes /eventos/{id}/estado with exactly { estado: "finalizado" }', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: FINALIZED_RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useFinalizeEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/estado',
      method: 'PATCH',
      data: { estado: 'finalizado' },
    })
  })

  it('invalidates closure readiness, event detail, and the events list on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: FINALIZED_RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useFinalizeEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: closureQueryKeys.readiness(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventsQueryKeys.detail(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventsQueryKeys.lists() })
  })

  it('never writes an optimistic result — cache data is untouched, only invalidated', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: FINALIZED_RECORD,
    })
    const queryClient = new QueryClient()
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData')

    const { result } = renderHook(() => useFinalizeEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(setQueryDataSpy).not.toHaveBeenCalled()
  })

  it('surfaces SGEB-4011 (repeated finalize / invalid transition) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message:
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useFinalizeEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('surfaces SGEB-1004 (unauthorized) without invalidating the cache', async () => {
    const error = new SgebApplicationError(403, {
      code: 'SGEB-1004',
      message: 'No tienes permisos para realizar esta acción.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useFinalizeEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('is not retried on failure', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message:
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useFinalizeEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
