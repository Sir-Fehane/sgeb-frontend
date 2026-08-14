import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { useApproveChecklistMutation } from '@/features/events/montage/queries/useApproveChecklistMutation'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RESPONSE = {
  instancia: {
    id_instancia: 9001,
    id_participacion: 5002,
    id_checklist: 1,
    completado: true,
    fecha: '2026-08-01T00:00:00',
    respuestas: [],
  },
  tipo: 'montaje' as const,
  desbloquea_asignacion: true,
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useApproveChecklistMutation', () => {
  it('PATCHes /checklist-instancias/{id}/aprobar with no request body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RESPONSE,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useApproveChecklistMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(9001)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/checklist-instancias/9001/aprobar',
      method: 'PATCH',
    })
  })

  it('invalidates the roster query for this event on success (checklist_ok only observable there)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RESPONSE,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useApproveChecklistMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(9001)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.participants(1001),
    })
  })

  it('surfaces a SgebApplicationError (e.g. SGEB-4005) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4005',
      message: 'Checklist incompleto no puede aprobarse.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useApproveChecklistMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(9001)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
