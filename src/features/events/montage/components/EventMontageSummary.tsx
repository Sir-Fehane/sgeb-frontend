import { EventDetailSection } from '@/features/events/components/EventDetailSection'

export interface EventMontageSummaryProps {
  participantsTotal: number
  checklistAprobadoTotal: number
  mesasLibresTotal: number
  mesasTotal: number
  conMesaAsignadaTotal: number
}

/**
 * Computed purely from the local fixture-backed participant/table lists —
 * never `GET /eventos/{id}/dashboard` (`DashboardEvento`, a separate,
 * explicitly out-of-scope live aggregate this branch does not integrate).
 * No hidden business formula: every number here is a plain count over the
 * same rows the checklist/table sections below render.
 */
export function EventMontageSummary({
  participantsTotal,
  checklistAprobadoTotal,
  mesasLibresTotal,
  mesasTotal,
  conMesaAsignadaTotal,
}: EventMontageSummaryProps) {
  return (
    <EventDetailSection title="Resumen">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Meseros</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {participantsTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Checklist aprobado
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {checklistAprobadoTotal} de {participantsTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Mesas libres</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {mesasLibresTotal} de {mesasTotal}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Con mesa asignada
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {conMesaAsignadaTotal} de {participantsTotal}
          </dd>
        </div>
      </dl>
    </EventDetailSection>
  )
}
