import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Text } from '@/shared/components'

/**
 * "Verificar limpieza" appears in the closure wireframe, but
 * `docs/FrontendArchitecture.md` §9/§18 explicitly records that no
 * captain-facing endpoint or checklist-type wiring backs it —
 * `SGEB-4015`'s technical diagnostic string mentions "checklist cierre
 * incompleto" only inside its own free-text context, never as a schema or
 * operation. This section is therefore purely informational: no
 * interactive control, no per-person/per-area rows, no "Marcar limpio" or
 * "Aprobar limpieza" action, and no reuse of the montage checklist's
 * approval flow (a different entity entirely — see the README's
 * "Cleanup / 'Verificar limpieza' contract gap" note). The one real,
 * documented signal this screen has for outstanding exits is
 * `participacionesSinSalida`, already shown in the readiness section
 * above.
 *
 * The rendered copy deliberately says nothing about *why* — no
 * "contrato"/"endpoint"/"pendiente de definición" or similar engineering
 * status language belongs in end-user product copy; that reasoning lives
 * only in this comment and in the README. The user only ever sees a
 * plain pointer to the one real signal available to them.
 */
export function EventClosureCleanupSection() {
  return (
    <EventDetailSection title="Verificación de limpieza">
      <Text size="sm" className="text-muted-foreground">
        Consulta las salidas verificadas en la sección de arriba como referencia para la
        limpieza del salón.
      </Text>
    </EventDetailSection>
  )
}
