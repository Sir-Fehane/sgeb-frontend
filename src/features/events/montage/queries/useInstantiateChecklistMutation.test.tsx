import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { useInstantiateChecklistMutation } from '@/features/events/montage/queries/useInstantiateChecklistMutation'
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

describe('useInstantiateChecklistMutation', () => {
  it('POSTs /participaciones/{id}/checklist-instancias with { idChecklist } (camelCase, never id_checklist — regression: SGEB-2001)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_instancia: 9001,
        id_participacion: 5002,
        id_checklist: 1,
        completado: false,
        fecha: '2026-08-01T00:00:00',
        respuestas: [],
      },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useInstantiateChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idParticipacion: 5002, idChecklist: 1 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/participaciones/5002/checklist-instancias',
      method: 'POST',
      data: { idChecklist: 1 },
    })
  })

  it('never sends undefined or snake_case id_checklist as the request body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_instancia: 9001,
        id_participacion: 5002,
        id_checklist: 7,
        completado: false,
        fecha: '2026-08-01T00:00:00',
        respuestas: [],
      },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useInstantiateChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idParticipacion: 5002, idChecklist: 7 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [config] = vi.mocked(requestSgeb).mock.calls[0]!
    expect(config.data).not.toHaveProperty('id_checklist')
    expect((config.data as { idChecklist: unknown }).idChecklist).toBe(7)
    expect((config.data as { idChecklist: unknown }).idChecklist).not.toBeUndefined()
  })

  it("invalidates only this participant's checklist-instancias query on success — a fresh instance never touches checklist_ok", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_instancia: 9001,
        id_participacion: 5002,
        id_checklist: 1,
        completado: false,
        fecha: '2026-08-01T00:00:00',
        respuestas: [],
      },
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useInstantiateChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ idParticipacion: 5002, idChecklist: 1 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.checklistInstancias(5002),
    })
  })
})
