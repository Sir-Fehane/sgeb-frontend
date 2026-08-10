import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventClosureReadinessViewModel } from '@/features/events/closure/types/closure'
import { Text } from '@/shared/components'

export interface EventPaymentsBlockedSectionProps {
  readiness: EventClosureReadinessViewModel
}

/**
 * Renders when Closure's `listo === false` — reuses the SAME readiness
 * data Closure already computes (`findEventClosureReadiness`, imported by
 * the page), never a second, independently-maintained copy of the three
 * blockers. This component only re-frames that data for a Payments-
 * specific heading; it does not duplicate or reinvent Closure's own
 * blocker logic. No enabled calculation control is ever rendered here.
 */
export function EventPaymentsBlockedSection({
  readiness,
}: EventPaymentsBlockedSectionProps) {
  const blockers: string[] = []
  if (!readiness.eventoFinalizado) {
    blockers.push('Evento pendiente de finalizar')
  }
  if (readiness.participacionesSinSalida > 0) {
    blockers.push(
      `${String(readiness.participacionesSinSalida)} participación(es) sin salida`,
    )
  }
  if (readiness.meserosSinClabeVigente > 0) {
    blockers.push(
      `${String(readiness.meserosSinClabeVigente)} mesero(s) sin datos bancarios vigentes`,
    )
  }

  return (
    <EventDetailSection title="Cálculo de pagos">
      <div className="flex flex-col gap-2">
        <Text size="sm" className="font-medium">
          No se pueden calcular los pagos todavía.
        </Text>
        <ul className="flex flex-col gap-1 pl-5">
          {blockers.map((blocker) => (
            <li key={blocker} className="text-body-sm text-muted-foreground list-disc">
              {blocker}
            </li>
          ))}
        </ul>
      </div>
    </EventDetailSection>
  )
}
