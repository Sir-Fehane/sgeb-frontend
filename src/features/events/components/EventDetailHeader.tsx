import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { Badge, Button, SectionHeading } from '@/shared/components'

export interface EventDetailHeaderProps {
  evento: EventDetailViewModel
}

const TIPO_LABELS: Record<EventDetailViewModel['tipo'], string> = {
  social: 'Social',
  empresarial: 'Empresarial',
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`:
 * `AppShell`'s `Topbar` already renders the page's one `<h1>` (see
 * `AppShellLayout`, now title-matching `/eventos/*` too). Status and type
 * are always accompanied by their text label (`EventStatusBadge`/
 * `TIPO_LABELS`), never color alone. `idEvento` is used only to build the
 * back-link's return context — it is not rendered as a visual identifier
 * anywhere on this page.
 */
export function EventDetailHeader({ evento }: EventDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/eventos">
          <IconArrowLeft aria-hidden="true" />
          Volver a eventos
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading className="text-heading">{evento.titulo}</SectionHeading>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{TIPO_LABELS[evento.tipo]}</Badge>
          <EventStatusBadge estado={evento.estado} />
        </div>
      </div>
    </div>
  )
}
