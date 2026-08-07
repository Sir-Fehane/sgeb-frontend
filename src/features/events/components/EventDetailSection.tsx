import type { ReactNode } from 'react'
import { useId } from 'react'

import { Card, CardContent, SectionHeading } from '@/shared/components'

export interface EventDetailSectionProps {
  title: string
  children: ReactNode
}

/**
 * Shared heading + landmark + card chrome for each Event Detail section —
 * feature-local (not imported from `features/dashboard`, which owns its
 * own near-identical `DashboardSection`; CLAUDE.md's Feature-Based
 * Architecture keeps features from importing each other's components).
 * `EventDetailHeader` renders the page's own `<h2>` for the event title;
 * every section below it is a further `<h2>` sibling (not nested under
 * the title), matching how `CaptainDashboardPage`'s sections sit
 * alongside its own summary content.
 */
export function EventDetailSection({ title, children }: EventDetailSectionProps) {
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
