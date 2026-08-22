import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Caption, SectionHeading, Text } from '@/shared/components'

export interface LiveOperationsHeaderProps {
  idEvento: number
  tituloEvento: string
}

/**
 * The page's own top-level content heading — an `<h2>`, not an `<h1>`,
 * same reasoning as `TeamSelectionHeader`. Returns to Event Detail
 * (`/eventos/{id}`), not the events list.
 */
export function LiveOperationsHeader({
  idEvento,
  tituloEvento,
}: LiveOperationsHeaderProps) {
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
        <SectionHeading className="text-heading">Control de salida</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          Registra la salida del personal vinculado a este evento y consulta su estado
          operativo.
        </Text>
      </div>
    </div>
  )
}
