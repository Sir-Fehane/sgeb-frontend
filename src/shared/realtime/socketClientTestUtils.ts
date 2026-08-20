import { vi } from 'vitest'

/**
 * Hand-rolled fake for the module-level `socket` singleton
 * (`socketClient.ts`) — shared by every test that needs `SocketProvider`
 * mounted (directly, or transitively via `AppShellLayout`) without opening
 * a real WebSocket connection under jsdom. Not a generic abstraction added
 * ahead of need: three call sites need the identical fake
 * (`AppShellLayout.test.tsx`, `SocketProvider.test.tsx`,
 * `useEventRealtimeRoom.test.tsx`), same bar the rest of this codebase
 * uses before sharing test setup (see `features/events/fixtures/`).
 *
 * Mirrors the real `Socket`'s event-emitter shape closely enough for
 * `SocketProvider` to register/unregister listeners and receive fake
 * server events via `__emit`/`__emitManager`, without pulling in the real
 * `socket.io-client` engine.
 */
export interface FakeSocket {
  connected: boolean
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  io: {
    on: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
  }
  /** Test-only: invokes every handler registered via `.on(event, ...)`, simulating a server push. */
  __emit: (event: string, ...args: unknown[]) => void
  /** Test-only: invokes every handler registered via `.io.on(event, ...)`, simulating a Manager-level event (`reconnect_attempt`, etc.). */
  __emitManager: (event: string, ...args: unknown[]) => void
}

export function createFakeSocket(): FakeSocket {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const managerListeners = new Map<string, Set<(...args: unknown[]) => void>>()

  const fakeSocket: FakeSocket = {
    connected: false,
    connect: vi.fn(() => {
      fakeSocket.connected = true
    }),
    disconnect: vi.fn(() => {
      fakeSocket.connected = false
    }),
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)?.add(handler)
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler)
    }),
    io: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!managerListeners.has(event)) {
          managerListeners.set(event, new Set())
        }
        managerListeners.get(event)?.add(handler)
      }),
      off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        managerListeners.get(event)?.delete(handler)
      }),
    },
    __emit: (event, ...args) => {
      listeners.get(event)?.forEach((handler) => {
        handler(...args)
      })
    },
    __emitManager: (event, ...args) => {
      managerListeners.get(event)?.forEach((handler) => {
        handler(...args)
      })
    },
  }

  return fakeSocket
}
