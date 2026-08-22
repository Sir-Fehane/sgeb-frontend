import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { NavItem } from '@/shared/components/layout/NavItem'
import { NAV_ITEMS, type NavItemConfig } from '@/shared/components/layout/nav-items'

export interface SidebarNavListProps {
  collapsed?: boolean
  onNavigate?: () => void
}

/**
 * `item.roles` (see `nav-items.ts`) restricts an entry to a session whose
 * `rol` claim is in that list. Absent `roles` means every authenticated
 * role sees it, unchanged from before this field existed. While the
 * session isn't `authenticated` yet (this component can render inside a
 * standalone `AppShell` in tests, ahead of `AppShellLayout`'s own
 * authenticated-only boundary), a role-restricted item is hidden rather
 * than guessed visible — the safe default matches what a real capitán/
 * mesero session would see for an admin-only item before authorization
 * ever ran.
 */
function isVisibleFor(item: NavItemConfig, rol: string | undefined): boolean {
  return (
    !item.roles || (rol !== undefined && (item.roles as readonly string[]).includes(rol))
  )
}

/**
 * The nav item list shared by the persistent desktop `Sidebar` and the
 * small-screen `MobileNavDrawer`, so both stay in sync from one source.
 */
export function SidebarNavList({ collapsed = false, onNavigate }: SidebarNavListProps) {
  const session = useOidcSessionStore((state) => state.session)
  const rol = session.status === 'authenticated' ? session.user.rol : undefined
  const items = NAV_ITEMS.filter((item) => isVisibleFor(item, rol))

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  )
}
