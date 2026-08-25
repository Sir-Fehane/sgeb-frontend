import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

import { BrandLogo } from '@/shared/components/layout/BrandLogo'
import { SidebarNavList } from '@/shared/components/layout/SidebarNavList'
import { cn } from '@/shared/utils/cn'

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

/**
 * Persistent desktop sidebar (`lg:` and up). Below that breakpoint this
 * is hidden entirely in favor of `MobileNavDrawer` — see `AppShell`.
 *
 * Capped to `h-screen` and pinned with `sticky top-0` so its own height
 * never depends on how tall `NAV_ITEMS` or the main content area get —
 * without that cap, a flex child's `overflow-y-auto` never actually
 * engages (it has no bounded height to overflow against), so a long nav
 * list — or a tall page — would grow this whole aside instead of
 * scrolling internally, pushing the collapse button below the viewport.
 * `min-h-0` on the `<nav>` is the other half of that fix: a flex item's
 * default `min-height: auto` would otherwise still refuse to shrink below
 * its content size even inside a height-capped parent.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        'border-border bg-card sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="border-border flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <BrandLogo className="size-8" />
        {!collapsed && (
          <span className="font-heading text-body text-foreground font-semibold">
            SGEB
          </span>
        )}
      </div>

      <nav
        aria-label="Navegación principal"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >
        <SidebarNavList collapsed={collapsed} />
      </nav>

      <div className="border-border shrink-0 border-t p-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : undefined}
          className={cn(
            'flex min-h-11 w-full items-center justify-center gap-2 rounded-lg',
            'font-sans text-body-sm text-muted-foreground',
            'hover:bg-accent hover:text-foreground',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
        >
          {collapsed ? (
            <IconChevronRight aria-hidden="true" className="size-5" />
          ) : (
            <>
              <IconChevronLeft aria-hidden="true" className="size-5" />
              <span>Contraer</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
