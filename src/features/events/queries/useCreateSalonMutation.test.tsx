import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { salonesQueryKeys } from '@/features/events/queries/salonesQueryKeys'
import { useCreateSalonMutation } from '@/features/events/queries/useCreateSalonMutation'
import type {
  CreateSalonRequest,
  SalonApiRecord,
} from '@/features/events/services/salonesApi'
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

const REQUEST: CreateSalonRequest = {
  nombre: 'Salón Nuevo',
  calle: 'Av. Reforma 100',
  cp: '06600',
  colonia: 'Juárez',
  ciudad: 'CDMX',
  estado: 'CDMX',
  latitud: 19.42,
  longitud: -99.16,
  capacidadMaxMesas: 30,
  capacidadPersonas: 150,
}

const RECORD: SalonApiRecord = {
  id_salon: 9,
  nombre: REQUEST.nombre,
  calle: REQUEST.calle,
  cp: REQUEST.cp,
  colonia: REQUEST.colonia,
  ciudad: REQUEST.ciudad,
  estado: REQUEST.estado,
  latitud: REQUEST.latitud,
  longitud: REQUEST.longitud,
  capacidad_max_mesas: REQUEST.capacidadMaxMesas,
  capacidad_personas: REQUEST.capacidadPersonas,
  activo: true,
}

describe('useCreateSalonMutation', () => {
  it('POSTs /salones with exactly the given request', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateSalonMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/salones',
      method: 'POST',
      data: REQUEST,
    })
  })

  it('invalidates the salones list on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateSalonMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: salonesQueryKeys.lists() })
  })

  it('is not retried on failure', async () => {
    const error = new Error('boom')
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateSalonMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(REQUEST)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
