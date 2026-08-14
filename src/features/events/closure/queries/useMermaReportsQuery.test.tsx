import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMermaReportsQuery } from '@/features/events/closure/queries/useMermaReportsQuery'
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

describe('useMermaReportsQuery', () => {
  it('requests GET /eventos/{id}/reportes-merma and resolves the mapped list', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        reportes: [
          {
            id_reporte: 42,
            id_evento: 1001,
            observaciones: null,
            fecha: '2026-09-12T23:10:00Z',
            detalles: [
              {
                id_merma_det: 1,
                id_reporte: 42,
                tipo: 'otro',
                descripcion: null,
                cantidad: 1,
                costo_estimado: null,
              },
            ],
          },
        ],
        costo_total: 0,
        piezas_sin_costear: 1,
      },
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMermaReportsQuery(1001), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/reportes-merma' }),
    )
    expect(result.current.data).toEqual([
      {
        idReporte: 42,
        fecha: '2026-09-12T23:10:00Z',
        observaciones: null,
        detalles: [{ tipo: 'otro', descripcion: null, cantidad: 1, costoEstimado: null }],
      },
    ])
  })

  it('skips the request entirely when idEvento is null', () => {
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMermaReportsQuery(null), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(requestSgeb).not.toHaveBeenCalled()
  })
})
