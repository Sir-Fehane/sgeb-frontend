import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'
import { useTeamSelectionParticipantsQuery } from '@/features/events/team-selection/queries/useTeamSelectionParticipantsQuery'
import type { ParticipacionApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
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
  estado: 'aparto',
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useTeamSelectionParticipantsQuery', () => {
  it('requests GET /eventos/{id}/participaciones and maps the response', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })

    const { result } = renderHook(() => useTeamSelectionParticipantsQuery(1001), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/eventos/1001/participaciones' }),
    )
    expect(result.current.data?.[0]?.idParticipacion).toBe(5001)
  })

  it('never calls the transport when idEvento is null (skipped query)', () => {
    const { result } = renderHook(() => useTeamSelectionParticipantsQuery(null), {
      wrapper: createWrapper(),
    })

    expect(requestSgeb).not.toHaveBeenCalled()
    expect(result.current.status).toBe('pending')
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('uses a query key scoped to the event id, never colliding across events', () => {
    expect(teamSelectionQueryKeys.list(1001)).not.toEqual(
      teamSelectionQueryKeys.list(2001),
    )
    expect(teamSelectionQueryKeys.list(1001)).toEqual(teamSelectionQueryKeys.list(1001))
  })

  it('retries a SgebNetworkError up to the bounded limit', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new SgebNetworkError('Sin conexión.'))

    function Wrapper({ children }: { children: ReactNode }) {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retryDelay: 0 } },
      })
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useTeamSelectionParticipantsQuery(1001), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(vi.mocked(requestSgeb).mock.calls.length).toBeGreaterThan(1)
  })

  it('propagates an AbortSignal to the transport', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })

    renderHook(() => useTeamSelectionParticipantsQuery(1001), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalled()
    })
    const config = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(config.signal).toBeInstanceOf(AbortSignal)
  })
})
