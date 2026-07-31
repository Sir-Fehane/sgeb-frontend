import { useState, type ReactNode } from 'react'

import { AppShellMain } from '@/shared/components/layout/AppShellMain'
import { MobileNavDrawer } from '@/shared/components/layout/MobileNavDrawer'
import { Sidebar } from '@/shared/components/layout/Sidebar'
import { Topbar } from '@/shared/components/layout/Topbar'

export interface AppShellProps {
  title: string
  breadcrumb?: ReactNode
  children: ReactNode
}

/**
 * Authenticated shell shared by `admin` and `capitan` — one app, one
 * shell, nav/actions to be filtered by role later
 * (docs/FrontendArchitecture.md §2, §12). Pure layout/navigation chrome:
 * no auth, route guard, or business logic lives here.
 *
 * Sidebar collapse and mobile-drawer-open are local UI state, not
 * Zustand — neither needs to be shared outside this component tree.
 */
export function AppShell({ title, breadcrumb, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => {
          setCollapsed((value) => !value)
        }}
      />
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => {
          setMobileNavOpen(false)
        }}
      />

      {/*
       * `inert` while the mobile drawer is open keeps focus and pointer
       * interaction out of the (visually dimmed) rest of the app without
       * a hand-rolled Tab-key focus trap — the drawer itself sits
       * outside this subtree so it stays interactive.
       */}
      <div className="flex min-w-0 flex-1 flex-col" inert={mobileNavOpen}>
        <Topbar
          title={title}
          breadcrumb={breadcrumb}
          onOpenNav={() => {
            setMobileNavOpen(true)
          }}
        />
        <AppShellMain>{children}</AppShellMain>
      </div>
    </div>
  )
}
