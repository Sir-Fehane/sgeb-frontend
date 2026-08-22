import type { ReactNode } from 'react'

import { BrandLogo } from '@/shared/components/layout/BrandLogo'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageTitle, Text } from '@/shared/components/ui/typography'
import { cn } from '@/shared/utils/cn'

export interface AuthLayoutProps {
  /**
   * Every routed auth page renders exactly one heading, here — pages
   * themselves must not render their own top-level heading (mirrors
   * `Topbar`'s role for `AppShell` pages).
   */
  title: string
  description?: string
  children: ReactNode
  /** Secondary navigation below the card (e.g. "Volver a iniciar sesión"). */
  footer?: ReactNode
  className?: string
}

/**
 * Centered, unauthenticated card layout for the public SSO web screens
 * (S1, the web adaptation of S3, S5, S6 — docs/FrontendArchitecture.md
 * §12). Deliberately has no sidebar/topbar/nav chrome and never reads
 * from or implies an authenticated session — a real, separate layout
 * from `AppShell`, not a themed variant of it.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
  className,
}: AuthLayoutProps) {
  return (
    <main
      className={cn(
        'bg-background flex min-h-screen items-center justify-center px-4 py-10 sm:px-6',
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo className="size-12" alt="SGEB" />
          <div className="flex flex-col gap-1">
            <PageTitle className="text-heading">{title}</PageTitle>
            {description ? (
              <Text size="sm" className="text-muted-foreground">
                {description}
              </Text>
            ) : null}
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-6">{children}</CardContent>
        </Card>

        {footer ? <div className="flex justify-center">{footer}</div> : null}
      </div>
    </main>
  )
}
