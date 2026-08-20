import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { useAssignTableMutation } from '@/features/events/montage/queries/useAssignTableMutation'
import { asignacionesQueryKeys } from '@/features/events/queries/asignacionesQueryKeys'
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

describe('useAssignTableMutation', () => {
  it('POSTs /participaciones/{id}/asignaciones with { idMesa } camelCase body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'ok' },
      data: {
        id_asignacion: 900,
        id_participacion: 42,
        id_mesa: 7,
        vinculada: false,
        fecha_asignacion: '2026-08-19T10:00:00.000Z',
        fecha_vinculacion: null,
      },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useAssignTableMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idParticipacion: 42, idMesa: 7 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/participaciones/42/asignaciones',
      method: 'POST',
      data: { idMesa: 7 },
    })
  })

  it('invalidates the assignments readback and the roster on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'ok' },
      data: {
        id_asignacion: 900,
        id_participacion: 42,
        id_mesa: 7,
        vinculada: false,
        fecha_asignacion: '2026-08-19T10:00:00.000Z',
        fecha_vinculacion: null,
      },
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAssignTableMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idParticipacion: 42, idMesa: 7 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: asignacionesQueryKeys.list(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.participants(1001),
    })
  })

  it('surfaces SGEB-4005 (checklist not approved) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4005',
      message: 'Primero completa y aprueba el checklist de montaje.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAssignTableMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idParticipacion: 42, idMesa: 7 })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
