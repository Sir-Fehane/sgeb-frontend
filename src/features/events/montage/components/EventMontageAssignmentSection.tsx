import { useId, useState } from 'react'

import type {
  AssignTableRequest,
  EventTableViewModel,
  MontageAssignmentViewModel,
  MontageChecklistStatus,
  ParticipacionEstado,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { Alert, Badge, Button, Label, Select, Text } from '@/shared/components'

export interface EventMontageAssignmentSectionProps {
  idParticipacion: number
  nombreParticipante: string
  estado: ParticipacionEstado
  checklistStatus?: MontageChecklistStatus | undefined
  currentAssignment?: MontageAssignmentViewModel
  freeTables: readonly EventTableViewModel[]
  isAssigning?: boolean
  assignErrorMessage?: string
  isReleasing?: boolean
  releaseErrorMessage?: string
  onAssignTable: (request: AssignTableRequest) => void
  onReleaseAssignment: (request: ReleaseAssignmentRequest) => void
}

/**
 * Server-enforced, confirmed against `ParticipacionService.asignarMesa`:
 * assigning a table requires the participation's `estado` to already be
 * `confirmo_llegada | asignado | vinculo` (`SGEB-4011`) and `checklist_ok`
 * (`SGEB-4005`). This UI mirrors both as a proactive safeguard —
 * `estado`'s early states below, and `checklistStatus !== 'approved'` — so
 * the button is never even offered for a request the server would reject;
 * the server remains authoritative regardless. No "change table" action
 * exists — moving a mesero is only ever release-then-assign, matching the
 * two separate documented endpoints (no single "change" operation exists).
 */
function ineligibilityReason(
  estado: ParticipacionEstado,
  checklistStatus: MontageChecklistStatus | undefined,
): string | undefined {
  if (
    estado === 'aparto' ||
    estado === 'seleccionado' ||
    estado === 'confirmo_asistencia'
  ) {
    return 'Pendiente de llegada.'
  }
  if (checklistStatus !== 'approved') {
    return 'Checklist pendiente de aprobación.'
  }
  return undefined
}

export function EventMontageAssignmentSection({
  idParticipacion,
  nombreParticipante,
  estado,
  checklistStatus,
  currentAssignment,
  freeTables,
  isAssigning = false,
  assignErrorMessage,
  isReleasing = false,
  releaseErrorMessage,
  onAssignTable,
  onReleaseAssignment,
}: EventMontageAssignmentSectionProps) {
  const [selectedMesaId, setSelectedMesaId] = useState('')
  const [confirmingRelease, setConfirmingRelease] = useState(false)
  const selectId = useId()

  if (estado === 'salida') {
    return (
      <Text size="sm" className="text-muted-foreground">
        Participación finalizada.
      </Text>
    )
  }

  if (currentAssignment) {
    return (
      <div className="flex flex-col gap-2">
        <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5">
          <Badge tone={currentAssignment.vinculada ? 'success' : 'neutral'}>
            {currentAssignment.etiquetaMesa}
          </Badge>
          <Text size="sm" className="text-muted-foreground">
            {currentAssignment.vinculada ? 'Vinculada' : 'Pendiente de vincular'}
          </Text>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isReleasing}
            aria-label={`Liberar ${currentAssignment.etiquetaMesa} de ${nombreParticipante}`}
            onClick={() => setConfirmingRelease(true)}
          >
            Liberar mesa
          </Button>
        </div>

        {confirmingRelease ? (
          <Alert tone="warning" title={`¿Liberar ${currentAssignment.etiquetaMesa}?`}>
            <p>La mesa quedará disponible para reasignarla a otro mesero.</p>
            {releaseErrorMessage ? (
              <p className="text-destructive mt-1">{releaseErrorMessage}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                loading={isReleasing}
                onClick={() =>
                  onReleaseAssignment({
                    idAsignacion: currentAssignment.idAsignacion,
                    idParticipacion,
                  })
                }
              >
                Confirmar liberación
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isReleasing}
                onClick={() => setConfirmingRelease(false)}
              >
                Cancelar
              </Button>
            </div>
          </Alert>
        ) : null}
      </div>
    )
  }

  const reason = ineligibilityReason(estado, checklistStatus)

  return (
    <div className="flex flex-col gap-2">
      <Text size="sm" className="text-muted-foreground">
        Sin mesa asignada.
      </Text>

      {reason ? (
        <Text size="sm" className="text-muted-foreground">
          {reason}
        </Text>
      ) : freeTables.length === 0 ? (
        <Text size="sm" className="text-muted-foreground">
          No hay mesas libres disponibles.
        </Text>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={selectId}>Mesa a asignar a {nombreParticipante}</Label>
            <Select
              id={selectId}
              value={selectedMesaId}
              onChange={(event) => setSelectedMesaId(event.target.value)}
            >
              <option value="">Selecciona una mesa</option>
              {freeTables.map((mesa) => (
                <option key={mesa.idMesa} value={mesa.idMesa}>
                  {mesa.etiqueta}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={isAssigning}
            aria-label={`Asignar mesa a ${nombreParticipante}`}
            disabled={selectedMesaId === ''}
            onClick={() => {
              onAssignTable({ idParticipacion, idMesa: Number(selectedMesaId) })
              setSelectedMesaId('')
            }}
          >
            Asignar mesa
          </Button>
        </div>
      )}

      {assignErrorMessage ? (
        <Text size="sm" className="text-destructive">
          {assignErrorMessage}
        </Text>
      ) : null}
    </div>
  )
}
