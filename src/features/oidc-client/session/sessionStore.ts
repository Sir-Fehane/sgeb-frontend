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

/**
 * Plain (non-hook) accessor for the current access token — used by the
 * authenticated SGEB transport (`shared/api/sgebClient.ts`) to resolve the
 * bearer token at request time, never captured once and reused. Returns
 * `undefined` when there is no authenticated session; the transport sends
 * the request without an `Authorization` header in that case rather than
 * inventing one.
 */
export function getOidcAccessToken(): string | undefined {
  const session = useOidcSessionStore.getState().session
  return session.status === 'authenticated' ? session.accessToken : undefined
}

/**
 * Updates the in-memory session with a newly refreshed access token,
 * preserving the existing `user` identity — the single source of truth
 * update used by the SGEB transport's SGEB-1002 (expired token) recovery
 * flow (`shared/api/sgebClient.ts`). Reuses `setAuthenticated` rather than
 * introducing a second store action.
 *
 * Returns `false` without changing state if the session is not currently
 * `authenticated` (e.g. it was reset concurrently, such as by a logout) —
 * the caller treats that as a refresh that could not be applied, not as an
 * error to throw.
 */
export function applyRefreshedAccessToken(payload: {
  accessToken: string
  accessTokenExpiresAt: number
  idToken?: string
  scope?: string
}): boolean {
  const { session, setAuthenticated } = useOidcSessionStore.getState()
  if (session.status !== 'authenticated') {
    return false
  }
  setAuthenticated({
    accessToken: payload.accessToken,
    accessTokenExpiresAt: payload.accessTokenExpiresAt,
    user: session.user,
    ...(payload.idToken ? { idToken: payload.idToken } : {}),
    ...(payload.scope ? { scope: payload.scope } : {}),
  })
  return true
}
