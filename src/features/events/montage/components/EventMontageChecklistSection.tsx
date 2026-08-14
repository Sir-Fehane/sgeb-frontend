import { IconCircle, IconCircleCheck } from '@tabler/icons-react'

import type {
  ApproveChecklistRequest,
  MontageChecklistViewModel,
} from '@/features/events/montage/types/montage'
import {
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_STATUS_TONES,
} from '@/features/events/montage/utils/montagePresentation'
import { Badge, Button, Text } from '@/shared/components'

export interface EventMontageChecklistSectionProps {
  idParticipacion: number
  nombreParticipante: string
  checklist?: MontageChecklistViewModel | undefined
  isApproving?: boolean
  /** Safe, backend-approved `SgebApplicationError`/`SgebNetworkError` message. Falls back to a generic message when absent — never a `technical_message`. */
  approveErrorMessage?: string
  onApproveChecklist: (request: ApproveChecklistRequest) => void
}

/**
 * Read-only checklist presentation — items are filled by the mesero
 * (`PUT /checklist-instancias/{id}/respuestas`), never by the captain.
 * The captain's own read path for this same data, in live integration,
 * is `GET /participaciones/{id}/checklist-instancias` (documented to feed
 * both the mesero's montage screen and this captain approval view) — this
 * component never implies the captain reads through the mesero's `PUT`.
 * No item here is an interactive checkbox (per the accessibility
 * requirement: no fake interactive controls for read-only state). Icon +
 * text conveys each item's `hecho` state, never color alone.
 *
 * "Aprobar checklist" is the one real captain action documented for this
 * screen (`PATCH /checklist-instancias/{id}/aprobar`, RF-21) — it is only
 * ever rendered enabled when `status === 'completed'`, mirroring SGEB-4005
 * ("Checklist incompleto no puede aprobarse") locally. There is no
 * captain-override path for an incomplete checklist, and no "reopen an
 * approved checklist" action — neither is documented.
 */
export function EventMontageChecklistSection({
  idParticipacion,
  nombreParticipante,
  checklist,
  isApproving = false,
  approveErrorMessage,
  onApproveChecklist,
}: EventMontageChecklistSectionProps) {
  if (!checklist) {
    return (
      <Text size="sm" className="text-muted-foreground">
        Este mesero aún no tiene un checklist de montaje instanciado.
      </Text>
    )
  }

  const completedCount = checklist.items.filter((item) => item.hecho).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={CHECKLIST_STATUS_TONES[checklist.status]}>
          {CHECKLIST_STATUS_LABELS[checklist.status]}
        </Badge>
        <Text size="sm" className="text-muted-foreground">
          {checklist.nombre} · {completedCount} de {checklist.items.length} ítems
          completos
        </Text>
      </div>

      <ul className="flex flex-col gap-1">
        {checklist.items.map((item) => (
          <li key={item.idItem} className="flex items-center gap-2">
            {item.hecho ? (
              <IconCircleCheck
                aria-hidden="true"
                className="text-success size-4 shrink-0"
              />
            ) : (
              <IconCircle
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0"
              />
            )}
            <Text size="sm">
              {item.descripcion} — {item.hecho ? 'completo' : 'pendiente'} (
              {item.cantidad} de {item.cantidadEsperada})
            </Text>
          </li>
        ))}
      </ul>

      {checklist.status === 'completed' ? (
        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            loading={isApproving}
            aria-label={`Aprobar checklist de ${nombreParticipante}`}
            onClick={() =>
              onApproveChecklist({
                idParticipacion,
                idChecklistInstancia: checklist.idChecklistInstancia,
              })
            }
          >
            Aprobar checklist
          </Button>
          {approveErrorMessage ? (
            <Text size="sm" className="text-destructive">
              {approveErrorMessage}
            </Text>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
