import type { ReactNode } from 'react'

export interface PublicDinerLayoutProps {
  children: ReactNode
}

/**
 * A minimal, mobile-first, full-page layout for the anonymous public
 * diner experience — no sidebar, no authenticated topbar, no
 * desktop-console width constraint. A real, separate layout from
 * `AppShell`/`AuthLayout`, feature-local for now (not promoted to
 * `shared/components/layout`): `docs/FrontendArchitecture.md` §12
 * proposes a shared `PublicLayout`, but this feature is its only
 * consumer today, so promoting it would be speculative — do that once a
 * second public route genuinely needs it.
 *
 * Renders its own `<main>` landmark — this is the one page-level
 * landmark for the whole route; `PublicDinerContent` and its children
 * render inside it without adding another.
 */
export function PublicDinerLayout({ children }: PublicDinerLayoutProps) {
  return (
    <main className="bg-background flex min-h-screen justify-center px-4 py-6 sm:px-6">
      <div className="flex w-full max-w-md flex-col gap-6">{children}</div>
    </main>
  )
}
