import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { MermaReportViewModel } from '@/features/events/closure/types/closure'
import {
  formatClosureCurrency,
  formatMermaReportDate,
} from '@/features/events/closure/utils/closureFormatting'
import { WASTE_TYPE_LABELS } from '@/features/events/closure/utils/closurePresentation'
import { Caption, Text } from '@/shared/components'

export interface EventClosureWasteReportsSectionProps {
  reports: readonly MermaReportViewModel[]
}

/**
 * Read-only presentation of existing merma reports, from the live `GET
 * /eventos/{id}/reportes-merma` response (see `types/closure.ts`).
 * `idReporte` (the real backend id) is never rendered as text; it exists
 * purely as a React list key.
 */
export function EventClosureWasteReportsSection({
  reports,
}: EventClosureWasteReportsSectionProps) {
  if (reports.length === 0) {
    return (
      <EventDetailSection title="Reportes de merma">
        <Text size="sm" className="text-muted-foreground">
          Aún no se han registrado reportes de merma para este evento.
        </Text>
      </EventDetailSection>
    )
  }

  return (
    <EventDetailSection title="Reportes de merma">
      <ul aria-label="Reportes de merma registrados" className="flex flex-col gap-3">
        {reports.map((report) => {
          const totalEstimado = report.detalles.reduce(
            (sum, detalle) => sum + (detalle.costoEstimado ?? 0),
            0,
          )

          return (
            <li
              key={report.idReporte}
              className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Caption>
                  <time dateTime={report.fecha}>
                    {formatMermaReportDate(report.fecha)}
                  </time>
                </Caption>
                <Text size="sm" className="font-medium">
                  {report.detalles.length} artículo(s) reportado(s)
                </Text>
              </div>

              <ul className="flex flex-col gap-1">
                {report.detalles.map((detalle, index) => (
                  // Presentation-only list; no documented per-item id exists.
                  <li key={index}>
                    <Text size="sm">
                      {WASTE_TYPE_LABELS[detalle.tipo]} · cantidad {detalle.cantidad}
                      {detalle.costoEstimado != null
                        ? ` · ${formatClosureCurrency(detalle.costoEstimado)}`
                        : ''}
                    </Text>
                  </li>
                ))}
              </ul>

              <Text size="sm" className="font-medium">
                Costo estimado total: {formatClosureCurrency(totalEstimado)}
              </Text>

              {report.observaciones ? (
                <Text size="sm" className="text-muted-foreground">
                  {report.observaciones}
                </Text>
              ) : null}
            </li>
          )
        })}
      </ul>
    </EventDetailSection>
  )
}
