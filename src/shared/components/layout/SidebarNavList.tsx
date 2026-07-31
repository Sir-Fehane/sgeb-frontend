import { NavItem } from '@/shared/components/layout/NavItem'
import { NAV_ITEMS } from '@/shared/components/layout/nav-items'

export interface SidebarNavListProps {
  collapsed?: boolean
  onNavigate?: () => void
}

/**
 * The nav item list shared by the persistent desktop `Sidebar` and the
 * small-screen `MobileNavDrawer`, so both stay in sync from one source.
 */
export function SidebarNavList({ collapsed = false, onNavigate }: SidebarNavListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
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
