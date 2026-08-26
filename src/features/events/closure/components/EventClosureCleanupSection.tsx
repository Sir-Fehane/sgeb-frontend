import { Link } from 'react-router-dom'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Button, Text } from '@/shared/components'

export interface EventClosureCleanupSectionProps {
  idEvento: number
}

/**
 * "Verificación de limpieza" — the exit ("checklist de salida") checklist,
 * `tipo: 'cierre'`. Previously a static placeholder (see git history):
 * `docs/FrontendArchitecture.md` §9/§18 recorded that no captain-facing
 * endpoint or checklist-type wiring backed it. That gap is now closed —
 * `POST /participaciones/{id}/checklist-instancias` has no `tipo`
 * restriction, so the same instantiate/monitor/approve machinery
 * `features/events/montage` already uses for `tipo: 'montaje'` works
 * identically here (`features/events/live-operations`'s
 * `LiveOperationsClosureChecklistSection`).
 *
 * The interactive UI lives on Control de salida, not duplicated here — per
 * participant, not per event, is where assigning/monitoring/approving an
 * exit checklist actually makes sense (mirrors why table assignment lives
 * on Montage, not here). This section is a real pointer to that screen,
 * not informational filler: closure is the event-level rollup, control de
 * salida is the per-participant operational screen.
 *
 * **Confirmed against the pinned backend authority: completing AND
 * approving a `cierre` checklist is now REQUIRED for "Dar salida"** —
 * `PATCH /participaciones/{id}/estado` → `salida` rejects with `SGEB-4027`
 * without it (`participacion_service.ts`'s `verificarChecklistCierre`, see
 * `features/events/live-operations/types/liveOperations.ts`'s
 * `ClosureChecklistViewModel` comment for the full backend read). This
 * supersedes an earlier audit finding that it was advisory-only — do not
 * resurrect that assumption. `participacionesSinSalida` (the readiness
 * section above) is still the event-level rollup signal; this section
 * points at the per-participant screen where the underlying checklist gate
 * is actually assigned/monitored/approved.
 */
export function EventClosureCleanupSection({
  idEvento,
}: EventClosureCleanupSectionProps) {
  return (
    <EventDetailSection title="Verificación de limpieza">
      <div className="flex flex-col items-start gap-2">
        <Text size="sm" className="text-muted-foreground">
          Asigna, monitorea y aprueba el checklist de salida de cada mesero desde Control
          de salida — un mesero no puede registrar su salida hasta que su checklist esté
          completo y aprobado. Consulta las salidas verificadas en la sección de arriba
          como referencia para la limpieza del salón.
        </Text>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to={`/eventos/${String(idEvento)}/operacion-en-vivo`}>
            Ir a Control de salida
          </Link>
        </Button>
      </div>
    </EventDetailSection>
  )
}
