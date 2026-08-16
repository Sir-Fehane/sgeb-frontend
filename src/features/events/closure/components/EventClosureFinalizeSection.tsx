import { useState } from 'react'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventStatus } from '@/features/events/types/event'
import { Alert, Badge, Button, Text } from '@/shared/components'

export interface EventClosureFinalizeSectionProps {
  estado: EventStatus
  canFinalize: boolean
  onFinalize: () => void
  isFinalizing?: boolean
  /** A safe, user-facing message for the most recent failed finalize attempt — never `technical_message`. */
  errorMessage?: string
}

/**
 * The one real event-state-machine action Closure owns: `en_curso →
 * finalizado` (`PATCH /eventos/{id_evento}/estado`, confirmed against the
 * pinned backend's `TRANSICIONES` map — `finalizado` and `cancelado` are
 * both terminal, no reopen/rollback exists anywhere in this branch).
 *
 * Availability is read directly from `evento.estado`, not from
 * `readiness.eventoFinalizado` — `estado` is the direct source for "what
 * action is valid right now", the same reasoning
 * `EventClosureReadinessSection` already applies to never recomputing
 * `listo`. `borrador`/`publicado`/`cancelado` render nothing (no invalid
 * action offered); `finalizado` renders a read-only completed state;
 * `en_curso` is the only state that offers the action.
 *
 * `canFinalize` is a UX-only role gate (`capitan`/`admin`, sourced from the
 * real OIDC session by the caller, same pattern as
 * `EventDetailPage`'s `canManageComanda`) — it never compensates for
 * backend authorization, which remains authoritative. The pinned backend's
 * confirmed absence of a per-event captain-ownership check for this
 * transition is a backend concern; this component does not fake a
 * client-side fix for it.
 *
 * Terminal/irreversible confirmation: no reusable confirmation dialog
 * exists yet in this codebase, and no dialog dependency is installed —
 * this uses the smallest accessible pattern available instead, an inline
 * expansion built entirely from the existing `Alert`/`Button` primitives,
 * rather than introducing a new dependency or a custom modal.
 */
export function EventClosureFinalizeSection({
  estado,
  canFinalize,
  onFinalize,
  isFinalizing = false,
  errorMessage,
}: EventClosureFinalizeSectionProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  if (estado === 'finalizado') {
    return (
      <EventDetailSection title="Finalización del evento">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text size="sm">Este evento ya fue finalizado.</Text>
          <Badge tone="success">Finalizado</Badge>
        </div>
      </EventDetailSection>
    )
  }

  if (estado !== 'en_curso' || !canFinalize) {
    return null
  }

  return (
    <EventDetailSection title="Finalización del evento">
      <div className="flex flex-col gap-4">
        {errorMessage ? (
          <Alert tone="danger" title="No se pudo finalizar el evento">
            <p>{errorMessage}</p>
          </Alert>
        ) : null}

        {isConfirming ? (
          <Alert tone="warning" title="Esta acción no se puede deshacer">
            <p>
              El evento pasará al estado &quot;finalizado&quot;. El sistema no permite
              reabrir ni revertir un evento finalizado.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsConfirming(false)
                }}
                disabled={isFinalizing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onFinalize}
                disabled={isFinalizing}
                loading={isFinalizing}
              >
                Confirmar finalización
              </Button>
            </div>
          </Alert>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              setIsConfirming(true)
            }}
          >
            Finalizar evento
          </Button>
        )}
      </div>
    </EventDetailSection>
  )
}
