import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NotificationBell } from '@/shared/realtime/components/NotificationBell'
import {
  useRealtimeNotificationStore,
  type RealtimeNotification,
} from '@/shared/realtime/notificationStore'
import type { SocketContextValue } from '@/shared/realtime/socketContext'

const mockUseSocket = vi.fn<() => SocketContextValue>()

vi.mock('@/shared/realtime/useSocket', () => ({
  useSocket: () => mockUseSocket(),
}))

function connectedState(overrides: Partial<SocketContextValue> = {}): SocketContextValue {
  return {
    connected: true,
    reconnecting: false,
    lastError: null,
    joinEventRoom: vi.fn(),
    leaveEventRoom: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockUseSocket.mockReturnValue(connectedState())
  useRealtimeNotificationStore.getState().clear()
})

afterEach(() => {
  vi.useRealTimers()
})

function seedNotification(overrides: Partial<Omit<RealtimeNotification, 'read'>> = {}) {
  useRealtimeNotificationStore.getState().add({
    id: crypto.randomUUID(),
    type: 'alerta:insumo',
    idEvento: 1001,
    tone: 'danger',
    title: 'Insumo: Ron blanco',
    body: 'botella vacía — 2 orden(es) en pausa.',
    emitidoEn: '2026-08-19T20:00:00.000Z',
    ...overrides,
  })
}

describe('NotificationBell', () => {
  it('renders with no unread badge when there are no notifications', () => {
    render(<NotificationBell />)

    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument()
  })

  it('shows an unread badge with the count once a notification arrives', () => {
    seedNotification()
    render(<NotificationBell />)

    expect(
      screen.getByRole('button', { name: 'Notificaciones — 1 sin leer' }),
    ).toBeInTheDocument()
  })

  it('shows the honest live scope, the subtle non-persistence disclaimer, and an empty state when opened with nothing received', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: 'Notificaciones' }))

    expect(screen.getByText('Alertas')).toBeInTheDocument()
    expect(screen.getByText('Avisos en vivo del evento abierto.')).toBeInTheDocument()
    // Must not imply the app keeps listening to every event ever opened, and
    // must not imply a persisted history — kept as a subtle secondary line
    // rather than the loudest text in the panel (see NotificationBell's own
    // doc comment).
    expect(
      screen.getByText('Los avisos de esta sesión no se guardan como historial.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sin avisos por ahora.')).toBeInTheDocument()
  })

  it('lists a received notification and marks it read on click', async () => {
    const user = userEvent.setup()
    seedNotification()
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: 'Notificaciones — 1 sin leer' }))
    expect(screen.getByText('Insumo: Ron blanco')).toBeInTheDocument()

    await user.click(screen.getByText('Insumo: Ron blanco'))

    expect(useRealtimeNotificationStore.getState().notifications[0]?.read).toBe(true)
  })

  it('marks all notifications read via the footer action', async () => {
    const user = userEvent.setup()
    seedNotification({ id: 'a' })
    seedNotification({ id: 'b' })
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: 'Notificaciones — 2 sin leer' }))
    await user.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }))

    expect(
      useRealtimeNotificationStore.getState().notifications.every((n) => n.read),
    ).toBe(true)
  })

  it('closes the dropdown on Escape', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('does not show a reconnecting hint immediately on a blip — only after it persists', () => {
    vi.useFakeTimers()
    mockUseSocket.mockReturnValue(
      connectedState({ connected: false, reconnecting: true }),
    )

    render(<NotificationBell />)
    expect(
      screen.queryByTitle('Reconectando el canal en tiempo real…'),
    ).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByTitle('Reconectando el canal en tiempo real…')).toBeInTheDocument()
  })
})
