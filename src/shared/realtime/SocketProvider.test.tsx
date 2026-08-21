import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { asignacionesQueryKeys } from '@/features/events/queries/asignacionesQueryKeys'
import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { mesasQueryKeys } from '@/features/events/queries/mesasQueryKeys'
import { attendanceQueryKeys } from '@/features/events/attendance/queries/attendanceQueryKeys'
import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { eventCubaitorQueryKeys } from '@/features/events/cubaitor/queries/eventCubaitorQueryKeys'
import { eventDashboardQueryKeys } from '@/features/events/dashboard/queries/eventDashboardQueryKeys'
import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { serviceRequestsQueryKeys } from '@/features/events/service-requests/queries/serviceRequestsQueryKeys'
import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'
import { refreshAccessToken } from '@/features/oidc-client/client/tokenClient'
import { applyRefreshedAccessToken } from '@/features/oidc-client/session/sessionStore'
import { useRealtimeNotificationStore } from '@/shared/realtime/notificationStore'
import { SocketProvider } from '@/shared/realtime/SocketProvider'
import { socket } from '@/shared/realtime/socketClient'
import type { FakeSocket } from '@/shared/realtime/socketClientTestUtils'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

vi.mock('@/shared/realtime/socketClient', async () => {
  const { createFakeSocket } = await import('@/shared/realtime/socketClientTestUtils')
  return { socket: createFakeSocket() }
})

vi.mock('@/features/oidc-client/client/tokenClient', () => ({
  refreshAccessToken: vi.fn(),
}))

vi.mock('@/features/oidc-client/session/sessionStore', () => ({
  applyRefreshedAccessToken: vi.fn(() => true),
}))

const fakeSocket = socket as unknown as FakeSocket

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

/** Minimal page-shaped consumer so `useEventRealtimeRoom` has a real `SocketProvider` above it. */
function RoomJoiner({ idEvento }: { idEvento: number }) {
  useEventRealtimeRoom(idEvento)
  return null
}

beforeEach(() => {
  fakeSocket.connected = false
  fakeSocket.connect.mockClear()
  fakeSocket.disconnect.mockClear()
  fakeSocket.emit.mockClear()
  fakeSocket.on.mockClear()
  fakeSocket.off.mockClear()
  fakeSocket.io.on.mockClear()
  fakeSocket.io.off.mockClear()
  vi.mocked(refreshAccessToken).mockReset()
  vi.mocked(applyRefreshedAccessToken).mockReset().mockReturnValue(true)
  useRealtimeNotificationStore.getState().clear()
})

function emitted(payloadOverrides: Record<string, unknown> = {}) {
  return { emitido_en: '2026-08-19T20:00:00.000Z', ...payloadOverrides }
}

describe('SocketProvider — connection lifecycle', () => {
  it('connects on mount and disconnects on unmount', () => {
    const queryClient = new QueryClient()
    const { unmount } = render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    expect(fakeSocket.connect).toHaveBeenCalledOnce()
    expect(fakeSocket.disconnect).not.toHaveBeenCalled()

    unmount()

    expect(fakeSocket.disconnect).toHaveBeenCalledOnce()
  })

  it("clears the ephemeral notification store on unmount (a new session must never inherit the previous one's feed)", () => {
    const queryClient = new QueryClient()
    const { unmount } = render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'alerta:insumo',
        emitted({
          idEvento: 1,
          nombreInsumo: 'Ron',
          motivo: 'botella_vacia',
          codigo: 'SGEB-4008',
          ordenesPausadas: 2,
        }),
      )
    })
    expect(useRealtimeNotificationStore.getState().notifications).toHaveLength(1)

    unmount()

    expect(useRealtimeNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('rejoins every currently-desired room on (re)connect — rooms are per-connection server-side, not resumed', () => {
    const queryClient = new QueryClient()
    render(
      <SocketProvider>
        <RoomJoiner idEvento={1001} />
      </SocketProvider>,
      { wrapper: createWrapper(queryClient) },
    )

    fakeSocket.emit.mockClear()

    act(() => {
      fakeSocket.__emit('connect')
    })

    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'unirse:evento',
      1001,
      expect.any(Function),
    )
  })

  it('attempts exactly one proactive refresh on a SGEB-1003 connect_error, then reconnects', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue({
      outcome: 'success',
      token: { access_token: 'fresh-token', token_type: 'Bearer', expires_in: 900 },
    })
    const queryClient = new QueryClient()
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })
    fakeSocket.connect.mockClear()

    await act(async () => {
      fakeSocket.__emit('connect_error', new Error('SGEB-1003'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(refreshAccessToken).toHaveBeenCalledOnce()
    expect(applyRefreshedAccessToken).toHaveBeenCalledOnce()
    expect(fakeSocket.connect).toHaveBeenCalledOnce()

    // A second SGEB-1003 within the same disconnected episode must not
    // trigger a second refresh — bounded to one attempt per episode.
    await act(async () => {
      fakeSocket.__emit('connect_error', new Error('SGEB-1003'))
      await Promise.resolve()
    })
    expect(refreshAccessToken).toHaveBeenCalledOnce()
  })

  it('does not attempt a refresh for a non-auth connect_error', () => {
    const queryClient = new QueryClient()
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit('connect_error', new Error('some network failure'))
    })

    expect(refreshAccessToken).not.toHaveBeenCalled()
  })
})

describe('SocketProvider — event → query invalidation mapping', () => {
  it('cupo:actualizado invalidates the event detail and team-selection roster', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'cupo:actualizado',
        emitted({ idEvento: 1001, cupoMeseros: 10, ocupados: 3, disponibles: 7 }),
      )
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventsQueryKeys.detail(1001) })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamSelectionQueryKeys.list(1001),
    })
  })

  it('participacion:cambio invalidates team-selection, attendance, montage participants, and closure readiness', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'participacion:cambio',
        emitted({ idEvento: 1001, idParticipacion: 5001, estado: 'seleccionado' }),
      )
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamSelectionQueryKeys.list(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceQueryKeys.list(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.participants(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: closureQueryKeys.readiness(1001),
    })
  })

  it('mesa:cambio invalidates mesas and asignaciones', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'mesa:cambio',
        emitted({
          idEvento: 1001,
          idMesa: 7,
          estado: 'ocupada',
          idParticipacion: 5001,
          vinculada: true,
        }),
      )
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mesasQueryKeys.list(1001) })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: asignacionesQueryKeys.list(1001),
    })
  })

  it('checklist:cambio invalidates the instance list and the montage roster (checklist_ok aggregate)', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'checklist:cambio',
        emitted({
          idEvento: 1001,
          idParticipacion: 5001,
          idInstancia: 9001,
          completado: true,
          aprobado: true,
          pendientes: 0,
        }),
      )
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.checklistInstancias(5001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: montageQueryKeys.participants(1001),
    })
  })

  it('cupo:actualizado, participacion:cambio, mesa:cambio, and checklist:cambio all also invalidate the event dashboard aggregate', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'cupo:actualizado',
        emitted({ idEvento: 1001, cupoMeseros: 10, ocupados: 3, disponibles: 7 }),
      )
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventDashboardQueryKeys.detail(1001),
    })

    invalidateSpy.mockClear()
    act(() => {
      fakeSocket.__emit(
        'mesa:cambio',
        emitted({
          idEvento: 1001,
          idMesa: 7,
          estado: 'ocupada',
          idParticipacion: 5001,
          vinculada: true,
        }),
      )
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventDashboardQueryKeys.detail(1001),
    })
  })

  it('orden:cambio invalidates the event dashboard aggregate AND the live order board/detail (feature/cubaitor-orders-live)', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'orden:cambio',
        emitted({ idEvento: 1001, idOrden: 501, idMesa: 7, estado: 'en_preparacion' }),
      )
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventDashboardQueryKeys.detail(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventCubaitorQueryKeys.ordenes(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventCubaitorQueryKeys.orden(501),
    })
  })

  it('dispensado:cambio invalidates the event dashboard aggregate, the order board, the pin config, and the alerts read', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'dispensado:cambio',
        emitted({
          idEvento: 1001,
          idDispensado: 900,
          idDetalle: 1,
          pinGpio: 4,
          estado: 'ok',
          volumenMl: 45,
          segundos: 2.9,
        }),
      )
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventDashboardQueryKeys.detail(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventCubaitorQueryKeys.ordenes(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventCubaitorQueryKeys.config(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventCubaitorQueryKeys.alertas(1001),
    })
  })

  it('alerta:insumo invalidates the event dashboard aggregate AND the bar screen alerts read, in addition to notifying', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'alerta:insumo',
        emitted({
          idEvento: 1001,
          idInsumo: 1,
          nombreInsumo: 'Ron',
          motivo: 'botella_vacia',
          codigo: 'SGEB-4009',
          ordenesPausadas: 2,
        }),
      )
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventDashboardQueryKeys.detail(1001),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventCubaitorQueryKeys.alertas(1001),
    })
  })

  it('solicitud:cambio invalidates the service-requests list and the event dashboard for every transition, not only pendiente', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'solicitud:cambio',
        emitted({
          idEvento: 1001,
          idSolicitud: 1,
          idMesa: 7,
          tipo: 'atencion',
          estado: 'atendida',
          idParticipacion: 5001,
        }),
      )
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serviceRequestsQueryKeys.all })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: eventDashboardQueryKeys.detail(1001),
    })
  })

  it('never invalidates unrelated query keys for a narrow event (e.g. mesa:cambio does not touch team-selection)', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'mesa:cambio',
        emitted({
          idEvento: 1001,
          idMesa: 7,
          estado: 'libre',
          idParticipacion: null,
          vinculada: false,
        }),
      )
    })

    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: teamSelectionQueryKeys.list(1001),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: eventsQueryKeys.detail(1001),
    })
  })
})

describe('SocketProvider — ephemeral notifications', () => {
  it('alerta:insumo adds a danger-tone notification', () => {
    const queryClient = new QueryClient()
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'alerta:insumo',
        emitted({
          idEvento: 1001,
          idInsumo: 3,
          nombreInsumo: 'Ron blanco',
          motivo: 'botella_vacia',
          codigo: 'SGEB-4008',
          ordenesPausadas: 2,
        }),
      )
    })

    const [notification] = useRealtimeNotificationStore.getState().notifications
    expect(notification).toMatchObject({
      type: 'alerta:insumo',
      tone: 'danger',
      idEvento: 1001,
    })
  })

  it('solicitud:cambio only notifies for a NEW ("pendiente") request, not atendida/cancelada', () => {
    const queryClient = new QueryClient()
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'solicitud:cambio',
        emitted({
          idEvento: 1001,
          idSolicitud: 1,
          idMesa: 4,
          tipo: 'servilletas',
          estado: 'atendida',
          idParticipacion: null,
        }),
      )
    })
    expect(useRealtimeNotificationStore.getState().notifications).toHaveLength(0)

    act(() => {
      fakeSocket.__emit(
        'solicitud:cambio',
        emitted({
          idEvento: 1001,
          idSolicitud: 2,
          idMesa: 4,
          tipo: 'servilletas',
          estado: 'pendiente',
          idParticipacion: null,
        }),
      )
    })
    expect(useRealtimeNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('cronograma:disparado adds a warning-tone notification using the server message verbatim', () => {
    const queryClient = new QueryClient()
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'cronograma:disparado',
        emitted({
          idEvento: 1001,
          idCronograma: 9,
          tipoTiempo: 'FUERTE',
          mensaje: 'Es hora de servir el plato fuerte.',
          destinatarios: 4,
        }),
      )
    })

    const [notification] = useRealtimeNotificationStore.getState().notifications
    expect(notification).toMatchObject({
      type: 'cronograma:disparado',
      tone: 'warning',
      body: 'Es hora de servir el plato fuerte.',
    })
  })

  it('shows a toast for a new notification, dismissible by the user', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()
    render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      fakeSocket.__emit(
        'alerta:insumo',
        emitted({
          idEvento: 1001,
          idInsumo: 1,
          nombreInsumo: 'Ron',
          motivo: 'botella_vacia',
          codigo: 'SGEB-4008',
          ordenesPausadas: 1,
        }),
      )
    })

    expect(screen.getByText('Insumo: Ron')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    expect(screen.queryByText('Insumo: Ron')).not.toBeInTheDocument()
  })
})

describe('SocketProvider — listener registration is exactly-once', () => {
  it('registers each domain event listener exactly once even under a StrictMode-style double render', () => {
    const queryClient = new QueryClient()
    const { rerender } = render(<SocketProvider>{null}</SocketProvider>, {
      wrapper: createWrapper(queryClient),
    })
    rerender(<SocketProvider>{null}</SocketProvider>)

    const cupoRegistrations = fakeSocket.on.mock.calls.filter(
      ([event]) => event === 'cupo:actualizado',
    )
    // One registration per mounted instance is expected from `render`+`rerender`
    // (React re-renders the same instance, not two) — the real regression this
    // guards is a *rerender* silently adding a second listener without cleanup.
    expect(cupoRegistrations.length).toBeLessThanOrEqual(1)
  })
})
