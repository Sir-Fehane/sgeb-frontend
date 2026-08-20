import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { useUpdateEventoMutation } from '@/features/events/queries/useUpdateEventoMutation'
import type {
  EventoApiRecord,
  UpdateEventoRequest,
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

const UPDATED_RECORD: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 1,
  capitan: {
    uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellido_paterno: 'Prueba',
    apellido_materno: null,
    correo: 'capitan.prueba@example.com',
  },
  titulo: 'Título actualizado',
  tipo: 'social',
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  radio_geocerca_m: 150,
  estado: 'borrador',
  creado_en: '2026-07-01T09:00:00',
}

describe('useUpdateEventoMutation', () => {
  it('PUTs /eventos/{id} with exactly the given request', async () => {
    const request: UpdateEventoRequest = { titulo: 'Título actualizado' }
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: UPDATED_RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useUpdateEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(request)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001',
      method: 'PUT',
      data: request,
    })
  })

  it('invalidates event detail and the events list on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: UPDATED_RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ titulo: 'x' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventsQueryKeys.detail(1001) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventsQueryKeys.lists() })
  })

  it('is not retried on failure, and surfaces the real error', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'El evento no admite esta operación en su estado actual.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useUpdateEventoMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ titulo: 'x' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe(error)
  })
})
