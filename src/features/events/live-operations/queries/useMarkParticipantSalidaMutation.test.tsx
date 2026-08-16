import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { useMarkParticipantSalidaMutation } from '@/features/events/live-operations/queries/useMarkParticipantSalidaMutation'
import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'
import type { ParticipacionApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: ParticipacionApiRecord = {
  id_participacion: 5001,
  puesto: 'mesero',
  estado: 'salida',
  checklist_ok: true,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000001',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: null,
    correo: 'juan@example.mx',
    telefono: null,
  },
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useMarkParticipantSalidaMutation', () => {
  it('sends only { estado: "salida" } to /participaciones/{id}/estado', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMarkParticipantSalidaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/participaciones/5001/estado',
      method: 'PATCH',
      data: { estado: 'salida' },
    })
  })

  it('invalidates the SAME authoritative roster key Team Selection reads (not a Live-Operations-local one), plus Closure readiness, on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkParticipantSalidaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamSelectionQueryKeys.list(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: closureQueryKeys.readiness(1001),
    })
  })

  it('does not retry automatically on failure', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(409, {
        code: 'SGEB-4011',
        message:
          'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
      }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMarkParticipantSalidaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })

  it('surfaces a SGEB-4011 invalid-transition error (e.g. repeated submit) without invalidating any cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message:
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkParticipantSalidaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('surfaces a SGEB-1004 unauthorized error without invalidating any cache', async () => {
    const error = new SgebApplicationError(403, {
      code: 'SGEB-1004',
      message: 'No tienes permisos para realizar esta acción.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkParticipantSalidaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
