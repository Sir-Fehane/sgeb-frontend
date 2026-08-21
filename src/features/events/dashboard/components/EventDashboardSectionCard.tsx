import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useId } from 'react'

import { Card, CardContent, SectionHeading, Text } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface EventDashboardSectionCardProps {
  title: string
  /**
   * `true` when this section's value came back `null` from `GET
   * /eventos/{id}/dashboard` — either a genuine SGEB-0004 partial failure
   * or (defensively) any other unexpected `null`. Renders an honest "no
   * disponible" message in place of `children` — NEVER a fabricated zero,
   * per this branch's core requirement (see `types/dashboard.ts`).
   */
  unavailable: boolean
  linkTo?: string
  linkLabel?: string
  children: ReactNode
}

/**
 * Shared heading + card chrome + optional deep link for each of the seven
 * event-dashboard sections — feature-local, same pattern as
 * `features/events/components/EventDetailSection`/`features/dashboard/
 * components/DashboardSection` (each feature owns its own near-identical
 * wrapper rather than sharing one across features, per CLAUDE.md's
 * Feature-Based Architecture — see `EventDetailSection`'s own comment).
 */
export function EventDashboardSectionCard({
  title,
  unavailable,
  linkTo,
  linkLabel,
  children,
}: EventDashboardSectionCardProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading id={headingId} className="text-subheading">
        {title}
      </SectionHeading>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {unavailable ? (
            <Text size="sm" className="text-muted-foreground">
              No disponible por el momento.
            </Text>
          ) : (
            children
          )}
          {linkTo ? (
            <Link
              to={linkTo}
              className={cn(
                'text-primary font-sans text-body-sm font-medium hover:underline',
                'focus-visible:ring-ring focus-visible:ring-offset-background self-start rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              )}
            >
              {linkLabel ?? 'Ver detalle'}
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}

export interface EventDashboardStatProps {
  label: string
  value: string | number
}

/** A single label/value stat row, reused by every section below. */
export function EventDashboardStat({ label, value }: EventDashboardStatProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Text size="sm" className="text-muted-foreground">
        {label}
      </Text>
      <Text className="font-semibold">{value}</Text>
    </div>
  )
}
