import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventClosureReadinessViewModel } from '@/features/events/closure/types/closure'
import { Badge, Text } from '@/shared/components'

export interface EventClosureReadinessSectionProps {
  readiness: EventClosureReadinessViewModel
}

/**
 * The three documented `/pagos/calcular` blockers
 * (`docs/api/openapi-sgeb.yaml` v1.6.0, `GET /eventos/{id_evento}/cierre`),
 * presented as plain text + `Badge` tone — never color alone, never a
 * raw SGEB code, never `technical_message`. `listo` is rendered exactly as
 * received, never recomputed from the other fields (see `types/closure.ts`).
 *
 * Blocker wording is deliberately restrained: `eventoFinalizado === false`
 * reads "Evento pendiente de finalizar" (never "Error"/"Pago fallido" — no
 * payment attempt has actually occurred on this screen). The two counts
 * are rendered exactly as documented — a plain integer, never expanded
 * into fictional per-participant/per-mesero rows, since the endpoint
 * documents only a count.
 */
export function EventClosureReadinessSection({
  readiness,
}: EventClosureReadinessSectionProps) {
  const {
    eventoFinalizado,
    participacionesTotal,
    participacionesSinSalida,
    meserosSinClabeVigente,
    listo,
  } = readiness

  return (
    <EventDetailSection title="Estado del cierre">
      <dl className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="font-sans text-body-sm font-medium">Evento finalizado</dt>
          <dd>
            <Badge tone={eventoFinalizado ? 'success' : 'warning'}>
              {eventoFinalizado ? 'Completado' : 'Evento pendiente de finalizar'}
            </Badge>
          </dd>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="font-sans text-body-sm font-medium">Participaciones totales</dt>
          <dd>
            <Text size="sm">{participacionesTotal}</Text>
          </dd>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="font-sans text-body-sm font-medium">Salidas verificadas</dt>
          <dd>
            <Badge tone={participacionesSinSalida === 0 ? 'success' : 'warning'}>
              {participacionesSinSalida === 0
                ? 'Sin pendientes'
                : `${String(participacionesSinSalida)} participación(es) pendiente(s)`}
            </Badge>
          </dd>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="font-sans text-body-sm font-medium">Datos bancarios</dt>
          <dd>
            <Badge tone={meserosSinClabeVigente === 0 ? 'success' : 'warning'}>
              {meserosSinClabeVigente === 0
                ? 'Sin pendientes'
                : `${String(meserosSinClabeVigente)} mesero(s) sin datos bancarios vigentes`}
            </Badge>
          </dd>
        </div>

        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <dt className="font-sans text-body-sm font-semibold">Estado general</dt>
          <dd>
            <Badge tone={listo ? 'success' : 'neutral'}>
              {listo ? 'Listo para calcular pagos' : 'No listo para calcular pagos'}
            </Badge>
          </dd>
        </div>
      </dl>
    </EventDetailSection>
  )
}
