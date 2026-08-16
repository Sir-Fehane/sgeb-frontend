import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'
import { useSelectParticipantMutation } from '@/features/events/team-selection/queries/useSelectParticipantMutation'
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
  estado: 'seleccionado',
  checklist_ok: false,
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

describe('useSelectParticipantMutation', () => {
  it('sends only { estado: "seleccionado" } to /participaciones/{id}/estado', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useSelectParticipantMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/participaciones/5001/estado',
      method: 'PATCH',
      data: { estado: 'seleccionado' },
    })
  })

  it('invalidates the roster query for this event on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSelectParticipantMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamSelectionQueryKeys.list(1001),
    })
  })

  it('succeeds and invalidates the roster even when the PATCH response omits usuario (the pinned backend does not preload it on this endpoint)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_participacion: 5001,
        puesto: 'mesero',
        estado: 'seleccionado',
        checklist_ok: false,
      },
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSelectParticipantMutation(1001), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate(5001)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamSelectionQueryKeys.list(1001),
    })
  })

  it('surfaces a SgebApplicationError (e.g. invalid transition) without invalidating the cache', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message:
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSelectParticipantMutation(1001), {
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
