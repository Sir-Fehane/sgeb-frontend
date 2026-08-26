import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { useCreateEventoMutation } from '@/features/events/queries/useCreateEventoMutation'
import type {
  CreateEventoRequest,
  EventoApiRecord,
} from '@/features/events/services/eventsApi'
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

const REQUEST: CreateEventoRequest = {
  idSalon: 1,
  uuidCapitan: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  titulo: 'Evento nuevo',
  tipo: 'social',
  fecha: '2099-01-10',
  horaPresentacion: '16:00',
  inicio: '2099-01-10T18:00:00',
  cupoMeseros: 5,
  numMesas: 10,
  tarifaPorMesero: 400,
  radioGeocercaM: 150,
}

/**
 * Deliberately has NO `capitan` field — confirmed real shape of `POST
 * /eventos`'s response (`EventoService.crear` returns `Evento.create({...})`
 * straight from the insert, never `.preload('capitan')`, unlike
 * `.obtener()`/`.listar()`). `createEvento`'s own comment documents this;
 * these fixtures must never silently reintroduce `capitan` here — that
 * previously masked the real `TypeError` bug (`mapCapitan` dereferencing an
 * absent field) that this file's own regression test below guards against.
 */
const CREATED_RECORD: Omit<EventoApiRecord, 'capitan'> = {
  id_evento: 5001,
  id_salon: 1,
  titulo: 'Evento nuevo',
  tipo: 'social',
  fecha: '2099-01-10',
  hora_presentacion: '16:00',
  inicio: '2099-01-10T18:00:00',
  fin: null,
  cupo_meseros: 5,
  num_mesas: 10,
  tarifa_por_mesero: 400,
  radio_geocerca_m: 150,
  estado: 'borrador',
  creado_en: '2099-01-01T00:00:00',
}

describe('useCreateEventoMutation', () => {
  it('POSTs /eventos with exactly the given request', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateEventoMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos',
      method: 'POST',
      data: REQUEST,
    })
  })

  it('resolves with the created event id, from a real HTTP 201 SGEB-0001 response — never a false "unexpected error" (regression: mapCapitan previously threw on this endpoint\'s capitan-less response, see createEvento\'s own comment)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Registro creado correctamente.' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateEventoMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ idEvento: 5001 })
    expect(result.current.error).toBeNull()
  })

  it('invalidates the events list on success, never the detail cache (nothing to invalidate for a new event)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateEventoMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventsQueryKeys.lists() })
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: eventsQueryKeys.detail(5001) }),
    )
  })

  it('never writes an optimistic result — cache data is untouched, only invalidated', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData')

    const { result } = renderHook(() => useCreateEventoMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(setQueryDataSpy).not.toHaveBeenCalled()
  })

  it('is not retried on failure', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4001',
      message: 'El salón ya tiene un evento en esa fecha.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateEventoMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe(error)
  })
})
