import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Caption, SectionHeading, Text } from '@/shared/components'

export interface EventPaymentsHeaderProps {
  idEvento: number
  tituloEvento: string
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`:
 * `AppShell`'s `Topbar` already renders the page's one `<h1>` ("Eventos").
 * The explanatory text states the manual-transfer boundary up front: this
 * screen never moves money, only records what already happened.
 */
export function EventPaymentsHeader({
  idEvento,
  tituloEvento,
}: EventPaymentsHeaderProps) {
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
        <SectionHeading className="text-heading">Pagos</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          Las transferencias se realizan manualmente, fuera de SGEB. Este panel solo
          registra si ya se pagó o si el intento fue rechazado.
        </Text>
      </div>
    </div>
  )
}
