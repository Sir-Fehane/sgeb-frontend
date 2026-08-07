import { EventDetailSection } from '@/features/events/components/EventDetailSection'

export interface TeamSelectionSummaryProps {
  /** `EventDetailViewModel.cupoMeseros` — reused from the existing Event Detail fixture, never a second independent source. */
  cupoMeseros: number
  numSeleccionados: number
  numApartos: number
}

/**
 * Read-only counts only — no computed "equipo completo" claim, since no
 * documented rule confirms cupo/selection completeness semantics (a
 * guessed staffing rule this branch does not invent).
 */
export function TeamSelectionSummary({
  cupoMeseros,
  numSeleccionados,
  numApartos,
}: TeamSelectionSummaryProps) {
  return (
    <EventDetailSection title="Resumen">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Cupo de meseros del evento
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {cupoMeseros}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Seleccionados actualmente
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {numSeleccionados}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Apartados</dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {numApartos}
          </dd>
        </div>
      </dl>
    </EventDetailSection>
  )
}
