import { Outlet, useLocation } from 'react-router-dom'

import { AppShell, NAV_ITEMS } from '@/shared/components/layout'

/**
 * Route-level layout wrapping every authenticated page in `AppShell`.
 * No auth/route guard lives here — see docs/FrontendArchitecture.md
 * §10.1 for why that's still pending.
 */
export function AppShellLayout() {
  const location = useLocation()
  const activeItem = NAV_ITEMS.find((item) => item.href === location.pathname)

  return (
    <AppShell title={activeItem?.label ?? 'SGEB'}>
      <Outlet />
    </AppShell>
  )
}
