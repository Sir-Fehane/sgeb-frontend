import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Button, Text } from '@/shared/components'

export interface EventPaymentsCalculateSectionProps {
  hasPayments: boolean
  onCalculate: () => Promise<void>
  isCalculating?: boolean
}

/**
 * Maps exactly to `POST /eventos/{id_evento}/pagos/calcular` — no frontend
 * amount formula, ever; the (fixture) callback owns the result. Labeled
 * "Recalcular pagos" once payments already exist, since the real endpoint
 * is documented idempotent and safe to call again (refreshes `pendiente`/
 * `fallido` rows, never touches `pagado` ones) — never worded to imply it
 * sends money.
 */
export function EventPaymentsCalculateSection({
  hasPayments,
  onCalculate,
  isCalculating = false,
}: EventPaymentsCalculateSectionProps) {
  async function handleClick() {
    if (isCalculating) {
      return
    }
    await onCalculate()
  }

  return (
    <EventDetailSection title="Cálculo de pagos">
      <div className="flex flex-col gap-2">
        <Button type="button" loading={isCalculating} onClick={() => void handleClick()}>
          {hasPayments ? 'Recalcular pagos' : 'Calcular pagos'}
        </Button>
        <Text size="sm" className="text-muted-foreground">
          {hasPayments
            ? 'Actualiza los pagos pendientes y fallidos con la tarifa y CLABE vigentes. Los pagos ya registrados como pagados no se modifican.'
            : 'Genera un pago por cada mesero elegible, usando la tarifa del evento y un snapshot de su CLABE vigente.'}
        </Text>
      </div>
    </EventDetailSection>
  )
}
