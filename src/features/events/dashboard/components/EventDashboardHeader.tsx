import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { EventDashboardViewModel } from '@/features/events/dashboard/types/dashboard'
import { formatEventDate } from '@/features/events/utils/eventDetailFormatting'
import { Button, Caption, SectionHeading, Text } from '@/shared/components'

export interface EventDashboardHeaderProps {
  dashboard: EventDashboardViewModel
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`:
 * `AppShell`'s `Topbar` already renders the page's one `<h1>` ("Eventos"),
 * same convention `EventClosureHeader`/`EventMontageHeader` already
 * establish for every nested `eventos/:id/*` page.
 */
export function EventDashboardHeader({ dashboard }: EventDashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to={`/eventos/${String(dashboard.idEvento)}`}>
          <IconArrowLeft aria-hidden="true" />
          Volver al evento
        </Link>
      </Button>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeading className="text-heading">{dashboard.titulo}</SectionHeading>
          <EventStatusBadge estado={dashboard.estado} />
        </div>
        <Text size="sm" className="text-muted-foreground">
          {formatEventDate(dashboard.fecha)} · {dashboard.salon}
        </Text>
        <Caption>Panel operativo del evento</Caption>
      </div>
    </div>
  )
}
