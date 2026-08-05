import { NavLink } from 'react-router-dom'

import type { NavItemConfig } from '@/shared/components/layout/nav-items'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/utils/cn'

export interface NavItemProps {
  item: NavItemConfig
  /** Icon-only rendering for the collapsed desktop sidebar. */
  collapsed?: boolean
  /** Called after activation — used to close the mobile drawer on navigate. */
  onNavigate?: (() => void) | undefined
}

/**
 * A single sidebar entry. `status: 'available'` items use React
 * Router's `NavLink`, which sets `aria-current="page"` on the active
 * route automatically. `status: 'route-pending'` items render as plain,
 * non-interactive text — no `role="link"` (or any interactive role), no
 * `href`, no `tabIndex`, no click handler: this is not a link with a
 * missing destination, it's a label with no control behind it at all,
 * and must not be announced as one. `aria-disabled="true"` still marks
 * it as an unavailable feature, and the visible "Ruta pendiente" text
 * (not color alone) carries that same information to assistive
 * technology as ordinary reading-order content — see the comment on
 * `NAV_ITEMS` for why these don't get an invented URL.
 */
export function NavItem({ item, collapsed = false, onNavigate }: NavItemProps) {
  const Icon = item.icon

  if (item.status === 'route-pending') {
    return (
      <li>
        <span
          aria-disabled="true"
          title={collapsed ? `${item.label} — ruta pendiente` : undefined}
          className={cn(
            'flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3',
            'font-sans text-body-sm text-muted-foreground font-medium',
            collapsed && 'justify-center px-2',
          )}
        >
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          <span
            className={cn(
              'flex min-w-0 flex-1 items-center justify-between gap-2',
              collapsed && 'sr-only',
            )}
          >
            <span className="truncate">{item.label}</span>
            <Badge tone="neutral" className="shrink-0">
              Ruta pendiente
            </Badge>
          </span>
        </span>
      </li>
    )
  }

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
