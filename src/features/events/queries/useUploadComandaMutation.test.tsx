import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { comandaQueryKeys } from '@/features/events/queries/comandaQueryKeys'
import { useUploadComandaMutation } from '@/features/events/queries/useUploadComandaMutation'
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

const CREATED_RECORD = {
  id_comanda: 7,
  id_evento: 1001,
  nombre_original: 'comanda.pdf',
  tipo_mime: 'application/pdf',
  tamano_bytes: 1024,
  activo: true,
  creado_en: '2026-09-01T10:00:00Z',
}

describe('useUploadComandaMutation', () => {
  it('POSTs the file via the real multipart contract', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()
    const file = new File(['%PDF-1.4'], 'comanda.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() => useUploadComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(file)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const calledConfig = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(calledConfig.url).toBe('/eventos/1001/comanda')
    expect(calledConfig.method).toBe('POST')
    expect((calledConfig.data as FormData).get('comanda')).toBe(file)
  })

  it('invalidates the comanda metadata query for this event on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUploadComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(new File(['x'], 'a.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: comandaQueryKeys.detail(1001),
    })
  })

  it('does not invalidate on a SgebApplicationError (e.g. SGEB-2004 bad MIME) and is never automatically retried', async () => {
    const error = new SgebApplicationError(400, {
      code: 'SGEB-2004',
      message: 'El valor seleccionado no es válido.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUploadComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(new File(['x'], 'a.zip', { type: 'application/zip' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(requestSgeb).toHaveBeenCalledOnce()
  })
})
