import { EventDetailSection } from '@/features/events/components/EventDetailSection'

export interface EventAttendanceSummaryProps {
  seleccionadosTotal: number
  asistenciaConfirmadaTotal: number
  llegadaConfirmadaTotal: number
  requierenAtencionTotal: number
}

/**
 * Computed purely from the local fixture-backed participant list — never
 * `DashboardEvento.staffing` (a separate, explicitly out-of-scope live
 * aggregate this branch does not integrate). No hidden business formula:
 * every number here is a plain count over the same rows the participant
 * list below renders.
 */
export function EventAttendanceSummary({
  seleccionadosTotal,
  asistenciaConfirmadaTotal,
  llegadaConfirmadaTotal,
  requierenAtencionTotal,
}: EventAttendanceSummaryProps) {
  return (
    <EventDetailSection title="Resumen">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Seleccionados</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {seleccionadosTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Asistencia confirmada
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {asistenciaConfirmadaTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Llegada confirmada
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {llegadaConfirmadaTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Requieren atención
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {requierenAtencionTotal}
          </dd>
        </div>
      </dl>
    </EventDetailSection>
  )
}
