import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { useCreateMermaReportMutation } from '@/features/events/closure/queries/useCreateMermaReportMutation'
import type { CreateWasteReportFormValues } from '@/features/events/closure/schemas/wasteReportSchema'
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

const FORM_VALUES: CreateWasteReportFormValues = {
  observaciones: 'Nota',
  detalles: [
    { tipo: 'copa_rota', descripcion: 'Barra', cantidad: 4, costo_estimado: 320 },
  ],
}

const CREATED_RECORD = {
  id_reporte: 42,
  id_evento: 1001,
  observaciones: 'Nota',
  fecha: '2026-09-12T23:10:00Z',
  detalles: [
    {
      id_merma_det: 1,
      id_reporte: 42,
      tipo: 'copa_rota',
      descripcion: 'Barra',
      cantidad: 4,
      costo_estimado: 320,
    },
  ],
}

describe('useCreateMermaReportMutation', () => {
  it('POSTs the real wire shape — costoEstimado camelCase, not the form’s costo_estimado', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useCreateMermaReportMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(FORM_VALUES)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/reportes-merma',
      method: 'POST',
      data: {
        observaciones: 'Nota',
        detalles: [
          { tipo: 'copa_rota', descripcion: 'Barra', cantidad: 4, costoEstimado: 320 },
        ],
      },
    })
  })

  it('invalidates the merma-reports query for this event on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: CREATED_RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateMermaReportMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(FORM_VALUES)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: closureQueryKeys.mermaReports(1001),
    })
  })

  it('surfaces a SgebApplicationError (e.g. SGEB-4013 invalid lifecycle stage) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'El evento no está en la etapa requerida para esta operación.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateMermaReportMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate(FORM_VALUES)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
