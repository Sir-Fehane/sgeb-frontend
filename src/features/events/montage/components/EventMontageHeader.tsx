import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Caption, SectionHeading, Text } from '@/shared/components'

export interface EventMontageHeaderProps {
  idEvento: number
  tituloEvento: string
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`:
 * `AppShell`'s `Topbar` already renders the page's one `<h1>` ("Eventos").
 * The explanatory text sets the checklist-vs-assignment boundary up front:
 * each montage checklist belongs to one mesero, and only an approved
 * checklist unlocks assigning that mesero a table.
 */
export function EventMontageHeader({ idEvento, tituloEvento }: EventMontageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to={`/eventos/${String(idEvento)}`}>
          <IconArrowLeft aria-hidden="true" />
          Volver al evento
        </Link>
      </Button>

      <div className="flex flex-col gap-1">
        <Caption>{tituloEvento}</Caption>
        <SectionHeading className="text-heading">
          Montaje y asignación de mesas
        </SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          Cada mesero tiene su propio checklist de montaje. Una mesa solo puede asignarse
          a un mesero una vez que su checklist está aprobado.
        </Text>
      </div>
    </div>
  )
}
