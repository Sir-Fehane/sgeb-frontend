import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Caption, SectionHeading, Text } from '@/shared/components'

export interface EventClosureHeaderProps {
  idEvento: number
  tituloEvento: string
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`:
 * `AppShell`'s `Topbar` already renders the page's one `<h1>` ("Eventos").
 */
export function EventClosureHeader({ idEvento, tituloEvento }: EventClosureHeaderProps) {
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
        <SectionHeading className="text-heading">Cierre del evento</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          Verifica los pendientes de cierre y registra reportes de merma. El cálculo y
          dispersión de pagos se hace desde una pantalla aparte.
        </Text>
      </div>
    </div>
  )
}
