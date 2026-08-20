import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { useReleaseAssignmentMutation } from '@/features/events/montage/queries/useReleaseAssignmentMutation'
import { asignacionesQueryKeys } from '@/features/events/queries/asignacionesQueryKeys'
import { mesasQueryKeys } from '@/features/events/queries/mesasQueryKeys'
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

describe('useReleaseAssignmentMutation', () => {
  it('DELETEs /asignaciones/{id}', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'ok' },
      data: null,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useReleaseAssignmentMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idAsignacion: 900, idParticipacion: 42 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/asignaciones/900',
      method: 'DELETE',
    })
  })

  it('invalidates the assignments readback, mesas, and the roster on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'ok' },
      data: null,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useReleaseAssignmentMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idAsignacion: 900, idParticipacion: 42 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: asignacionesQueryKeys.list(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mesasQueryKeys.list(1001) })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.participants(1001),
    })
  })

  it('surfaces SGEB-4018 (active orders) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4018',
      message: 'Esa mesa tiene actividad en curso; no puede eliminarse ni liberarse.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useReleaseAssignmentMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idAsignacion: 900, idParticipacion: 42 })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
