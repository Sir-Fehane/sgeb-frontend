import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { useOidcSessionBootstrap } from '@/features/oidc-client/session/useOidcSessionBootstrap'
import { Spinner } from '@/shared/components'
import { AppShell, NAV_ITEMS } from '@/shared/components/layout'

/**
 * Route-level layout wrapping every authenticated page in `AppShell` — and,
 * as of this branch, the single private-route authentication boundary
 * (docs/FrontendArchitecture.md §10.1). This is the ONLY place
 * `useOidcSessionBootstrap()` is called, so there is exactly one bootstrap
 * owner for the whole private console; no child route re-triggers it.
 *
 * While the session status is anything other than `authenticated`
 * (`idle`/`authenticating` during restoration, or `anonymous`/`error` once
 * it definitively resolves without a session), the private `<Outlet />`
 * subtree is never mounted — this is what closes the timing hole where a
 * future feature page could fire an authenticated TanStack Query request
 * before a token exists (§6). `anonymous`/`error` additionally trigger the
 * existing, already-used visible-authorization helper
 * (`beginAuthorization`) exactly once via a ref guard — the same one-shot
 * pattern `useOidcSessionBootstrap` and `AuthCallbackPage` already use for
 * StrictMode safety — since this repository's `/login` route is an
 * intentionally frozen, dev-only no-op (see its own doc comment) and was
 * never the live entry point; every real "start authorization" call site in
 * the current codebase (`bootstrap.ts`'s silent-redirect,
 * `AuthCallbackPage`'s retry-visible/restart) already calls
 * `beginAuthorization` directly, so this guard follows that same
 * established mechanism rather than inventing a second one.
 *
 * `useOidcSessionBootstrap` receives this same `${location.pathname}
 * ${location.search}` as its own `returnTo`, so its step-2 silent
 * redirect returns here instead of defaulting to `/panel` (regression
 * fix — see that hook's own comment).
 */
export function AppShellLayout() {
  const location = useLocation()
  useOidcSessionBootstrap(`${location.pathname}${location.search}`)
  const status = useOidcSessionStore((store) => store.session.status)
  const hasRequestedAuthorization = useRef(false)

  useEffect(() => {
    if (status !== 'anonymous' && status !== 'error') {
      return
    }
    if (hasRequestedAuthorization.current) {
      return
    }
    hasRequestedAuthorization.current = true
    // Preserves the originally requested private destination through the
    // round trip via the existing, already-validated `returnTo` mechanism
    // (`beginAuthorization` → `isSafeReturnTo`) — no new redirect contract.
    void beginAuthorization({ returnTo: `${location.pathname}${location.search}` })
  }, [status, location])

  const activeItem = NAV_ITEMS.find(
    (item) =>
      item.href === location.pathname ||
      (item.href !== null && location.pathname.startsWith(`${item.href}/`)),
  )

  if (status !== 'authenticated') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <Spinner size="lg" label="Verificando tu sesión" />
      </div>
    )
  }

  return (
    <AppShell title={activeItem?.label ?? 'SGEB'}>
      <Outlet />
    </AppShell>
  )
}
