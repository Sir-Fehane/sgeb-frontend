import { Link } from 'react-router-dom'

import { Button, Card, CardContent, CardHeading, Text } from '@/shared/components'

export interface ReportsPaymentsLinkSectionProps {
  idEvento: number
}

/**
 * Payments already have their own real, dedicated screen
 * (`/eventos/{id}/pagos`, `EventPaymentsPage`) — this card is a
 * discoverability shortcut only, scoped to the currently selected event
 * (see `ReportsContent`'s "Mostrando reportes de" context line), never a
 * second fetch/render of payment data. Per CLAUDE.md ("reuse existing
 * components... avoid duplicating functionality") and this branch's own
 * instruction not to rebuild closure/payment workflows inside Reports.
 * Uses the same `Button asChild` deep-link affordance as
 * `ReportsMermaSummarySection`'s "Ver detalle en Cierre" and
 * `EventClosureContent`'s own "Ir a pagos" shortcut.
 */
export function ReportsPaymentsLinkSection({
  idEvento,
}: ReportsPaymentsLinkSectionProps) {
  return (
    <section aria-labelledby="reports-payments-heading" className="flex flex-col gap-3">
      <CardHeading id="reports-payments-heading">Pagos</CardHeading>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Text size="sm" className="text-muted-foreground">
            El detalle de pagos por mesero vive en la pantalla de Pagos del evento.
          </Text>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link to={`/eventos/${String(idEvento)}/pagos`}>Ver pagos del evento</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
