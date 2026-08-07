import { create } from 'zustand'

import type {
  OidcAuthenticatedSession,
  OidcSessionState,
} from '@/features/oidc-client/types/session'

/**
 * The in-memory-only client-side session. Zustand per CLAUDE.md's own
 * example use case ("authenticated user" is explicitly listed) — this is
 * client-only UI/application state, never server cache, so it does not
 * belong in TanStack Query. Nothing here is persisted: no `persist`
 * middleware, no localStorage/sessionStorage — a page reload always
 * starts back at `idle`, by design (see ADR-002).
 */
export interface OidcSessionStore {
  session: OidcSessionState
  setAuthenticating: () => void
  setAuthenticated: (payload: Omit<OidcAuthenticatedSession, 'status'>) => void
  setAnonymous: () => void
  setError: (message: string) => void
  /** Returns to `idle` — used by tests and by logout orchestration. */
  reset: () => void
}

const IDLE_SESSION: OidcSessionState = { status: 'idle' }

export const useOidcSessionStore = create<OidcSessionStore>((set) => ({
  session: IDLE_SESSION,
  setAuthenticating: () => set({ session: { status: 'authenticating' } }),
  setAuthenticated: (payload) =>
    set({ session: { status: 'authenticated', ...payload } }),
  setAnonymous: () => set({ session: { status: 'anonymous' } }),
  setError: (message) => set({ session: { status: 'error', message } }),
  reset: () => set({ session: IDLE_SESSION }),
}))

/** Plain (non-hook) accessor for use outside React components/render, e.g. logout orchestration. */
export function resetOidcSession(): void {
  useOidcSessionStore.getState().reset()
}
