import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useApproveClosureChecklistMutation } from '@/features/events/live-operations/queries/useApproveClosureChecklistMutation'
import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import type { AprobarChecklistApiRecord } from '@/features/events/montage/services/montageApi'
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

const RESPONSE: AprobarChecklistApiRecord = {
  instancia: {
    id_instancia: 7001,
    id_participacion: 5002,
    id_checklist: 2,
    completado: true,
    aprobado_en: '2026-08-26T20:00:00.000Z',
    fecha: '2026-08-25T00:00:00',
    respuestas: [],
  },
  tipo: 'cierre',
  desbloquea_asignacion: false,
}

describe('useApproveClosureChecklistMutation', () => {
  it('PATCHes /checklist-instancias/{id}/aprobar with no request body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RESPONSE,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useApproveClosureChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({ idParticipacion: 5002, idChecklistInstancia: 7001 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/checklist-instancias/7001/aprobar',
      method: 'PATCH',
    })
  })

  it("invalidates that participant's checklist-instancia query on success — the persisted aprobado_en is picked up on the next refetch, not faked locally", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RESPONSE,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useApproveClosureChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({ idParticipacion: 5002, idChecklistInstancia: 7001 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.checklistInstancias(5002),
    })
  })

  it('invalidates exactly one query (the checklist instancia) — no roster/participants invalidation, since a cierre approval never touches checklist_ok', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RESPONSE,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useApproveClosureChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({ idParticipacion: 5002, idChecklistInstancia: 7001 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
  })

  it('surfaces a SGEB-4005 incomplete-checklist error without invalidating any cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4005',
      message: 'Primero completa y aprueba el checklist de montaje.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useApproveClosureChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({ idParticipacion: 5002, idChecklistInstancia: 7001 })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
