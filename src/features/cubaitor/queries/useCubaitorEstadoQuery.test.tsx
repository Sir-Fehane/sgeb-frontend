import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCubaitorEstadoQuery } from '@/features/cubaitor/queries/useCubaitorEstadoQuery'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useCubaitorEstadoQuery', () => {
  it('fetches GET /cubaitors/{id}/estado and surfaces enLinea as reported', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_cubaitor: 7,
        nombre: 'Barra 1',
        mac: 'AA:BB:CC:DD:EE:FF',
        en_linea: true,
        ultima_conexion: '2026-08-25T10:00:00',
        segundos_sin_reportar: 12,
        pines_configurados: 3,
      },
    })

    const { result } = renderHook(() => useCubaitorEstadoQuery(7), { wrapper })

    await waitFor(() => {
      expect(result.current.data?.enLinea).toBe(true)
    })
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/cubaitors/7/estado' }),
    )
  })
})
