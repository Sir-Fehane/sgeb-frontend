import type { ReactNode } from 'react'
import { useId } from 'react'

import { Card, CardContent, SectionHeading } from '@/shared/components'

export interface DashboardSectionProps {
  title: string
  children: ReactNode
}

/**
 * Shared heading + landmark + card chrome for each of the 6 dashboard
 * sections. `AppShell`'s `Topbar` already renders the page's `<h1>`
 * ("Panel"), so each section gets its own `<h2>` (via `SectionHeading`)
 * rather than `Card`'s `<h3>` `CardTitle` — there is no intermediate
 * h2-level grouping between the page title and these sections.
 */
export function DashboardSection({ title, children }: DashboardSectionProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading id={headingId} className="text-subheading">
        {title}
      </SectionHeading>
      <Card>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </section>
  )
}
