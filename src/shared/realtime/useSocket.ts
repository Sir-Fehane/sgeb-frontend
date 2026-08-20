import { useContext } from 'react'

import { SocketContext, type SocketContextValue } from '@/shared/realtime/socketContext'

/**
 * Consumes the realtime connection/room context. Throws outside
 * `SocketProvider` — every caller lives inside the authenticated panel
 * (`AppShellLayout`'s subtree), where the provider is always mounted; a
 * `null` context here means a real wiring bug (e.g. a page rendered
 * outside `AppShellLayout`), not a state to degrade gracefully from.
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider.')
  }
  return context
}
