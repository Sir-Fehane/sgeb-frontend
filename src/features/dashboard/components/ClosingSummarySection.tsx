import { DashboardSection } from '@/features/dashboard/components/DashboardSection'
import { DashboardSectionUnavailable } from '@/features/dashboard/components/DashboardSectionUnavailable'
import type { ClosingSummaryViewModel } from '@/features/dashboard/types/dashboard'
import { formatMxn, formatRating } from '@/features/dashboard/utils/dashboardFormatting'

export interface ClosingSummarySectionProps {
  cierre: ClosingSummaryViewModel | null
}

/**
 * `DashboardCapitan.cierre` — monetary values formatted via the
 * isolated `formatMxn` utility (never re-derived client-side), and a
 * `null` rating rendered as "Sin calificaciones" rather than a blank or
 * a zero. Zero amounts are valid values, not "unavailable". No payment
 * action here — payments are out of scope for this branch.
 */
export function ClosingSummarySection({ cierre }: ClosingSummarySectionProps) {
  return (
    <DashboardSection title="Cierre y pagos">
      {cierre === null ? (
        <DashboardSectionUnavailable />
      ) : (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-caption text-muted-foreground">
              Eventos sin pagos calculados
            </dt>
            <dd className="font-heading text-heading text-foreground font-semibold">
              {cierre.eventosSinPagosCalculados}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-caption text-muted-foreground">
              Pagos pendientes
            </dt>
            <dd className="font-heading text-heading text-foreground font-semibold">
              {cierre.pagosPendientes}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-caption text-muted-foreground">
              Monto pendiente
            </dt>
            <dd className="font-heading text-heading text-foreground font-semibold">
              {formatMxn(cierre.montoPendiente)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-caption text-muted-foreground">
              Merma estimada
            </dt>
            <dd className="font-heading text-heading text-foreground font-semibold">
              {formatMxn(cierre.mermaCostoEstimado)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-caption text-muted-foreground">
              Calificación promedio
            </dt>
            <dd className="font-heading text-heading text-foreground font-semibold">
              {formatRating(cierre.calificacionPromedio)}
            </dd>
          </div>
        </dl>
      )}
    </DashboardSection>
  )
}
