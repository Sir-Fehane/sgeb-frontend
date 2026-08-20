import { createContext } from 'react'

export interface SocketContextValue {
  /** Mirrors `socket.connected` — kept in React state so consumers rerender on change. */
  connected: boolean
  /** True while socket.io's own automatic reconnection loop is retrying after an unexpected disconnect. */
  reconnecting: boolean
  /** The most recent `connect_error` message (often a SGEB code, e.g. `SGEB-1003`), cleared on the next successful connect. Diagnostic only — no UI currently renders it verbatim. */
  lastError: string | null
  /**
   * Joins the `evento:{idEvento}` room — ref-counted, so two components
   * reading the same event simultaneously (e.g. StrictMode's double-invoke
   * in dev) never double-count a leave. Safe to call before the socket has
   * finished connecting: socket.io-client queues the `emit` and flushes it
   * on connect.
   */
  joinEventRoom: (idEvento: number) => void
  leaveEventRoom: (idEvento: number) => void
}

/**
 * Split into its own file (not exported alongside `SocketProvider`) purely
 * so `react-refresh/only-export-components` stays clean — a file that
 * exports both a component and a non-component value defeats Fast Refresh
 * for that component.
 */
export const SocketContext = createContext<SocketContextValue | null>(null)
