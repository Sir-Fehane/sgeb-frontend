import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMontageChecklistInstanciaQueries } from '@/features/events/montage/queries/useMontageChecklistInstanciaQueries'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useMontageChecklistInstanciaQueries', () => {
  it('fans out one GET /participaciones/{id}/checklist-instancias request per participation id, in the same order', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        {
          id_instancia: 900,
          id_participacion: 0,
          id_checklist: 1,
          completado: false,
          fecha: '',
          respuestas: [],
        },
      ],
    })

    const { result } = renderHook(
      () => useMontageChecklistInstanciaQueries([5001, 5002]),
      {
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => {
      expect(result.current.every((query) => query.isSuccess)).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/participaciones/5001/checklist-instancias' }),
    )
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/participaciones/5002/checklist-instancias' }),
    )
    expect(result.current).toHaveLength(2)
  })

  it('returns an empty array of query results for an empty roster, without calling the transport', () => {
    const { result } = renderHook(() => useMontageChecklistInstanciaQueries([]), {
      wrapper: createWrapper(),
    })

    expect(result.current).toEqual([])
    expect(requestSgeb).not.toHaveBeenCalled()
  })
})
