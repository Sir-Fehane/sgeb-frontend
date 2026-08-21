import { Link } from 'react-router-dom'

import { ReportsErrorState } from '@/features/reports/components/ReportsErrorState'
import type { EventMermaSummaryViewModel } from '@/features/reports/types/report'
import { formatReportMxn } from '@/features/reports/utils/reportFormatting'
import {
  Button,
  Card,
  CardContent,
  CardHeading,
  Skeleton,
  Text,
} from '@/shared/components'

export interface ReportsMermaSummarySectionProps {
  idEvento: number
  summary: EventMermaSummaryViewModel | null
  isLoading: boolean
  errorMessage?: string | undefined
  onRetry: () => void
}

/**
 * Merma (waste) totals for the currently selected event (see the shared
 * "Mostrando reportes de" context line `ReportsContent` renders above this
 * card, and this section's own `idEvento` — every number here is scoped to
 * that one event, never a cross-event total) —
 * `GET /eventos/{id}/reportes-merma`'s server-computed `costo_total`/
 * `piezas_sin_costear`, previously unused by Closure (see
 * `services/reportsApi.ts`'s own comment). The itemized breakdown stays
 * Closure's own screen; this links there instead of duplicating it, using
 * the same `Button asChild` deep-link affordance `EventClosureContent`'s
 * own "Ir a pagos" shortcut already established, rather than a bare text
 * link.
 */
export function ReportsMermaSummarySection({
  idEvento,
  summary,
  isLoading,
  errorMessage,
  onRetry,
}: ReportsMermaSummarySectionProps) {
  return (
    <section aria-labelledby="reports-merma-heading" className="flex flex-col gap-3">
      <CardHeading id="reports-merma-heading">Merma</CardHeading>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : errorMessage ? (
            <ReportsErrorState errorMessage={errorMessage} onRetry={onRetry} />
          ) : summary ? (
            <>
              <Text size="sm">
                {summary.reportesCount} reporte(s) registrado(s) · Costo estimado total:{' '}
                {formatReportMxn(summary.costoTotal)}
              </Text>
              {summary.piezasSinCostear > 0 ? (
                <Text size="sm" className="text-muted-foreground">
                  {summary.piezasSinCostear} pieza(s) sin costo estimado.
                </Text>
              ) : null}
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link to={`/eventos/${String(idEvento)}/cierre`}>
                  Ver detalle en Cierre
                </Link>
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
