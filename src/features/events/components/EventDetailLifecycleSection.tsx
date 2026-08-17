import { useState } from 'react'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventStatus } from '@/features/events/types/event'
import { Alert, Button, Text } from '@/shared/components'

export interface EventDetailLifecycleSectionProps {
  estado: EventStatus
  /**
   * UX-only role gate (`capitan`/`admin`, sourced from the real OIDC
   * session) — never compensates for backend authorization, which remains
   * authoritative. The pinned backend's confirmed absence of a per-event
   * captain-ownership check for `PATCH /eventos/{id}/estado` is a backend
   * concern; this component does not fake a client-side fix for it — same
   * reasoning `EventClosureFinalizeSection`'s own `canFinalize` already
   * documents.
   */
  canManage: boolean
  /**
   * The event's current real Mesa count, once known — `undefined` while
   * still loading. Used only to show an informational hint next to
   * "Publicar evento" when it is `0` (the pinned backend's confirmed
   * `borrador → publicado` precondition, `SGEB-4013`); the button itself
   * stays enabled regardless, and the real backend error — not this hint —
   * remains the authoritative outcome if the count is stale or wrong.
   */
  mesasCount?: number
  onTransition: (estado: EventStatus) => void
  isTransitioning?: boolean
  /** A safe, user-facing message for the most recent failed transition — never `technical_message`. */
  errorMessage?: string
}

/**
 * The lifecycle actions this feature owns: publish, start, return-to
 * -draft, cancel (`PATCH /eventos/{id}/estado`) — confirmed against the
 * pinned backend's `TRANSICIONES` map (`EventoService`):
 * `borrador → publicado|cancelado`, `publicado → en_curso|borrador|cancelado`,
 * `en_curso → cancelado`. `en_curso → finalizado` deliberately does NOT
 * appear here — that transition stays owned by
 * `EventClosureFinalizeSection`, reached from the event's Closure screen,
 * per this branch's report (no duplicate "Finalizar evento" action).
 * `finalizado`/`cancelado` are both terminal: no action renders for
 * either.
 *
 * Only "Cancelar evento" asks for confirmation — the one action here with
 * no path back once submitted through this component (a cancelled event's
 * only listed backend transition is none; `TRANSICIONES.cancelado` is
 * empty). "Publicar"/"Iniciar"/"Volver a borrador" all remain reachable
 * through further transitions, so they submit on a single click. Reuses
 * the same inline `Alert`/`Button` confirmation pattern
 * `EventClosureFinalizeSection` already established — no dialog dependency
 * exists in this codebase.
 */
export function EventDetailLifecycleSection({
  estado,
  canManage,
  mesasCount,
  onTransition,
  isTransitioning = false,
  errorMessage,
}: EventDetailLifecycleSectionProps) {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)

  if (!canManage || estado === 'finalizado' || estado === 'cancelado') {
    return null
  }

  return (
    <EventDetailSection title="Estado del evento">
      <div className="flex flex-col gap-4">
        {errorMessage ? (
          <Alert tone="danger" title="No se pudo actualizar el estado del evento">
            <p>{errorMessage}</p>
          </Alert>
        ) : null}

        {estado === 'borrador' && mesasCount === 0 ? (
          <Alert tone="info">
            Agrega al menos una mesa (ver la sección "Mesas") para poder publicar este
            evento.
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {estado === 'borrador' ? (
            <Button
              type="button"
              size="sm"
              disabled={isTransitioning}
              loading={isTransitioning}
              onClick={() => {
                onTransition('publicado')
              }}
            >
              Publicar evento
            </Button>
          ) : null}

          {estado === 'publicado' ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={isTransitioning}
                loading={isTransitioning}
                onClick={() => {
                  onTransition('en_curso')
                }}
              >
                Iniciar evento
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTransitioning}
                onClick={() => {
                  onTransition('borrador')
                }}
              >
                Volver a borrador
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isTransitioning}
            onClick={() => {
              setIsConfirmingCancel(true)
            }}
          >
            Cancelar evento
          </Button>
        </div>

        {isConfirmingCancel ? (
          <Alert tone="warning" title="Esta acción no se puede deshacer">
            <p>
              El evento pasará al estado &quot;cancelado&quot;. El sistema no permite
              reabrir ni revertir un evento cancelado.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsConfirmingCancel(false)
                }}
                disabled={isTransitioning}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isTransitioning}
                loading={isTransitioning}
                onClick={() => {
                  onTransition('cancelado')
                }}
              >
                Confirmar cancelación
              </Button>
            </div>
          </Alert>
        ) : null}

        {estado === 'en_curso' ? (
          <Text size="sm" className="text-muted-foreground">
            La finalización de este evento se realiza desde su Cierre.
          </Text>
        ) : null}
      </div>
    </EventDetailSection>
  )
}
