import { useEffect } from 'react'

import { useSocket } from '@/shared/realtime/useSocket'

/**
 * Joins the `evento:{idEvento}` room for as long as the calling page is
 * mounted, leaving on unmount or when `idEvento` changes. No-op when
 * `idEvento` is `null` — mirrors the existing `skipToken`-style convention
 * every live query hook in `features/events` already uses for a
 * not-yet-parsed/malformed route id (e.g. `useEventDetailQuery`).
 *
 * This is the ONLY way a page opts into live updates for one event; it
 * never talks to `socket` directly (see `SocketProvider`'s own comment on
 * why room scope is intentionally per-page, not global).
 */
export function useEventRealtimeRoom(idEvento: number | null): void {
  const { joinEventRoom, leaveEventRoom } = useSocket()

  useEffect(() => {
    if (idEvento === null) {
      return
    }
    joinEventRoom(idEvento)
    return () => {
      leaveEventRoom(idEvento)
    }
  }, [idEvento, joinEventRoom, leaveEventRoom])
}
