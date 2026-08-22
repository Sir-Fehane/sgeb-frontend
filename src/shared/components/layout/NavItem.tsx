import { NavLink } from 'react-router-dom'

import type { NavItemConfig } from '@/shared/components/layout/nav-items'
import { cn } from '@/shared/utils/cn'

export interface NavItemProps {
  item: NavItemConfig
  /** Icon-only rendering for the collapsed desktop sidebar. */
  collapsed?: boolean
  /** Called after activation — used to close the mobile drawer on navigate. */
  onNavigate?: (() => void) | undefined
}

/**
 * A single sidebar entry. Every `NAV_ITEMS` entry is now a confirmed,
 * navigable route — the previous `status: 'route-pending'` placeholder
 * rendering (non-interactive text, no `href`, an always-visible "Ruta
 * pendiente" badge) was removed on `feature/app-shell-hardening` once its
 * last two consumers ("Operación en vivo", "Pagos") were removed from
 * `NAV_ITEMS` itself — see that file's own comment. This always renders
 * React Router's `NavLink`, which sets `aria-current="page"` on the
 * active route automatically.
 */
export function NavItem({ item, collapsed = false, onNavigate }: NavItemProps) {
  const Icon = item.icon

  return (
    <li>
      <NavLink
        to={item.href}
        end
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'flex min-h-11 items-center gap-3 rounded-lg px-3',
            'font-sans text-body-sm font-medium transition-colors',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent',
            collapsed && 'justify-center px-2',
          )
        }
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
      </NavLink>
    </li>
  )
}
