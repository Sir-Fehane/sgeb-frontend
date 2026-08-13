import { Outlet, useLocation } from 'react-router-dom'

import { useOidcSessionBootstrap } from '@/features/oidc-client/session/useOidcSessionBootstrap'
import { AppShell, NAV_ITEMS } from '@/shared/components/layout'

/**
 * Route-level layout wrapping every authenticated page in `AppShell`.
 * No auth/route guard lives here — see docs/FrontendArchitecture.md
 * §10.1 for why that's still pending. `useOidcSessionBootstrap` attempts
 * to silently restore a session on first mount (`feature/oidc-live-bootstrap`)
 * but does not gate rendering on the result — that is still a future
 * route-guard branch's job, not this one's.
 */
export function AppShellLayout() {
  useOidcSessionBootstrap()
  const location = useLocation()
  const activeItem = NAV_ITEMS.find(
    (item) =>
      item.href === location.pathname ||
      (item.href !== null && location.pathname.startsWith(`${item.href}/`)),
  )

  return (
    <AppShell title={activeItem?.label ?? 'SGEB'}>
      <Outlet />
    </AppShell>
  )
}
