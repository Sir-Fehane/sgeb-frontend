import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Caption, SectionHeading, Text } from '@/shared/components'

export interface TeamSelectionHeaderProps {
  idEvento: number
  tituloEvento: string
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`:
 * `AppShell`'s `Topbar` already renders the page's one `<h1>` ("Eventos",
 * via `AppShellLayout`'s segment-safe `/eventos/*` title match). Returns
 * to Event Detail (`/eventos/{id}`), not the events list — this screen is
 * one level deeper than `EventDetailHeader`'s "Volver a eventos".
 */
export function TeamSelectionHeader({
  idEvento,
  tituloEvento,
}: TeamSelectionHeaderProps) {
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
        <SectionHeading className="text-heading">Selección de equipo</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          Confirma a los meseros y personal de barra apartados para este evento.
        </Text>
      </div>
    </div>
  )
}
