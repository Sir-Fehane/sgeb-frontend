import { Navigate } from 'react-router-dom'

import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { BrandLogo } from '@/shared/components/layout/BrandLogo'
import { Button, PageTitle, Text } from '@/shared/components'

/**
 * Routed at `/` — the public, unauthenticated entry point
 * (`feature/pre-release-polish-and-hardening`). Replaces the previous
 * behavior where `/` was `AppShellLayout`'s own guarded `index` route: an
 * anonymous visitor landing there was immediately, invisibly redirected
 * into the SSO `/authorize` flow with no SGEB UI ever rendered first — an
 * authentication-failure-style first impression, not a real landing
 * experience. This page is registered as an unguarded top-level sibling of
 * `AppShellLayout` (same pattern as `/publico/mesas/:codigoQr` and
 * `/auth/callback`), so it never triggers `useOidcSessionBootstrap` (that
 * hook has exactly one owner, `AppShellLayout` — see its own comment) and
 * never assumes an authenticated session.
 *
 * Reads `useOidcSessionStore` read-only (no bootstrap call) purely to
 * redirect an already-authenticated session (e.g. SPA-internal back
 * navigation to `/` after logging in, within the same page load) straight
 * to `/panel` instead of showing a login prompt to someone already signed
 * in — a session-store read this page already had every right to make, not
 * a new authentication concern. A fresh page load always starts at `idle`
 * (session is memory-only, ADR-002), so this only ever fires for
 * client-side navigation, never a hard reload.
 *
 * "Iniciar sesión" starts the exact same, unmodified SSO Authorization
 * Code + PKCE flow every other login entry point in this app uses
 * (`beginAuthorization`, no `returnTo` override — same default `/panel`
 * destination as `AuthCallbackPage`'s own `handleRestart`) — no OIDC logic
 * is duplicated or reimplemented here.
 */
export function LandingPage() {
  const status = useOidcSessionStore((state) => state.session.status)

  if (status === 'authenticated') {
    return <Navigate to="/panel" replace />
  }

  function handleLogin() {
    void beginAuthorization()
  }

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <BrandLogo className="size-16" alt="SGEB" />

      <div className="flex max-w-md flex-col gap-2">
        <PageTitle className="text-heading">SGEB</PageTitle>
        <Text className="text-muted-foreground">
          Sistema de Gestión de Eventos Banqueteros — administra el personal, las bebidas
          y la operación de tus eventos desde un solo lugar.
        </Text>
      </div>

      <Button type="button" onClick={handleLogin}>
        Iniciar sesión
      </Button>
    </main>
  )
}
