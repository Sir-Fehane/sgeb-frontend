import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Caption, SectionHeading, Text } from '@/shared/components'

export interface EventAttendanceHeaderProps {
  idEvento: number
  tituloEvento: string
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`:
 * `AppShell`'s `Topbar` already renders the page's one `<h1>` ("Eventos").
 * The explanatory text is required reading, not decoration: it states
 * outright that arrival confirmation happens on the mesero's own device,
 * so this screen is never mistaken for a check-in tool.
 */
export function EventAttendanceHeader({
  idEvento,
  tituloEvento,
}: EventAttendanceHeaderProps) {
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
        <SectionHeading className="text-heading">Pase de lista</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          La confirmación de asistencia y llegada se realiza desde el dispositivo de cada
          mesero. Esta pantalla solo muestra el resultado.
        </Text>
      </div>
    </div>
  )
}
