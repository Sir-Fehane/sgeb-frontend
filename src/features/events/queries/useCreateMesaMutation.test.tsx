import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mesasQueryKeys } from '@/features/events/queries/mesasQueryKeys'
import { useCreateMesaMutation } from '@/features/events/queries/useCreateMesaMutation'
import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import type { MesaApiRecord } from '@/features/events/services/mesasApi'
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

const RECORD: MesaApiRecord = {
  id_mesa: 501,
  id_evento: 1001,
  etiqueta: 'Mesa 1',
  codigo_qr: '3f2a9c14-1234-4abc-89ab-000000000000',
  nfc_uid: null,
  estado: 'libre',
}

describe('useCreateMesaMutation', () => {
  it('POSTs /eventos/{id}/mesas with exactly the given request', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateMesaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ etiqueta: 'Mesa 1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/mesas',
      method: 'POST',
      data: { etiqueta: 'Mesa 1' },
    })
  })

  it('invalidates only the mesas list on success — never Event Detail (num_mesas is unrelated)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateMesaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ etiqueta: 'Mesa 1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mesasQueryKeys.list(1001) })
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: eventsQueryKeys.detail(1001) }),
    )
  })

  it('is not retried on failure', async () => {
    const error = new Error('boom')
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateMesaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ etiqueta: 'Mesa 1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
