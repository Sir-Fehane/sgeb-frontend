import { useEffect, useRef } from 'react'

import { bootstrapSession } from '@/features/oidc-client/protocol/bootstrap'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'

/**
 * Runs `bootstrapSession()` exactly once per app lifetime, only from the
 * store's initial `idle` state — never re-attempted merely because the
 * host component remounts during client-side navigation (StrictMode's
 * intentional double effect invocation is guarded the same way
 * `pages/AuthCallbackPage.tsx` guards its own one-shot effect), and never
 * re-attempted after a prior bootstrap already settled to `anonymous`/
 * `error` within this same page load — a hard reload is what triggers a
 * fresh attempt, not a route change.
 *
 * Deliberately NOT mounted at the application root (`app/App.tsx`): this
 * hook's fallback path can trigger a full-page redirect to the provider,
 * which must never happen for `/publico/*` (the comensal trust boundary,
 * `docs/FrontendArchitecture.md` §2.2) or the frozen `/login`-family
 * screens. It is wired only into `AppShellLayout`, the boundary that
 * already represents "every authenticated page."
 *
 * `returnTo` — the caller's current `${location.pathname}${location.search}`
 * — is forwarded to `bootstrapSession`'s own step-2 silent redirect, so a
 * hard reload on a private route (`/eventos`, `/eventos/:id/montaje`, …)
 * returns to that same route once the round trip completes, instead of
 * silently defaulting to `/panel`. Read once, at the moment this effect
 * actually starts a bootstrap attempt — never re-read on a later
 * re-render, so a route change that happens to occur while a bootstrap is
 * already in flight can never retarget it.
 */
export function useOidcSessionBootstrap(returnTo: string): void {
  const status = useOidcSessionStore((store) => store.session.status)
  const setAuthenticating = useOidcSessionStore((store) => store.setAuthenticating)
  const setAuthenticated = useOidcSessionStore((store) => store.setAuthenticated)
  const setAnonymous = useOidcSessionStore((store) => store.setAnonymous)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (status !== 'idle' || hasStarted.current) {
      return
    }
    hasStarted.current = true
    setAuthenticating()

    void bootstrapSession({}, returnTo).then((outcome) => {
      if (outcome.kind === 'restored') {
        setAuthenticated(outcome.session)
        return
      }
      if (outcome.kind === 'anonymous') {
        setAnonymous()
        return
      }
      // 'silent-redirect': navigation to the provider is already under
      // way (or was attempted and failed closed to anonymous inside
      // bootstrapSession itself) — nothing further to do from here.
    })
  }, [status, setAuthenticating, setAuthenticated, setAnonymous, returnTo])
}
