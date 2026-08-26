import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checklistsQueryKeys } from '@/features/checklists/queries/checklistsQueryKeys'
import {
  useCreateChecklistMutation,
  useDeactivateChecklistMutation,
  useUpdateChecklistMutation,
} from '@/features/checklists/queries/useChecklistMutations'
import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const CHECKLIST_RECORD = {
  id_checklist: 1,
  nombre: 'Montaje de salón',
  tipo: 'montaje' as const,
  activo: true,
  items: [
    {
      id_item: 10,
      id_checklist: 1,
      descripcion: 'Colocar mantelería',
      cantidad_esperada: 20,
      orden: 1,
      activo: true,
    },
  ],
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCreateChecklistMutation', () => {
  it("invalidates both the admin catalog cache and the Montage screen's template cache on success", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: CHECKLIST_RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({
      nombre: 'Montaje de salón',
      tipo: 'montaje',
      items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: checklistsQueryKeys.list() })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.checklistTemplates(),
    })
  })
})

describe('useUpdateChecklistMutation', () => {
  it('surfaces SGEB-4017 (open instances in a live event) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4017',
      message: 'La plantilla tiene instancias abiertas en un evento vigente.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({
      idChecklist: 1,
      input: {
        nombre: 'Montaje de salón',
        tipo: 'montaje',
        items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
      },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})

describe('useDeactivateChecklistMutation', () => {
  it('DELETEs and invalidates both catalog caches on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeactivateChecklistMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/checklists/1', method: 'DELETE' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: checklistsQueryKeys.list() })
  })
})
