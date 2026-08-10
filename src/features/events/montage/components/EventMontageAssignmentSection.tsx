import { useId, useState } from 'react'

import type {
  AssignTableRequest,
  EventTableViewModel,
  MontageAssignmentViewModel,
  MontageChecklistStatus,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { Badge, Button, Label, Select, Text } from '@/shared/components'

export interface EventMontageAssignmentSectionProps {
  idParticipacion: number
  nombreParticipante: string
  checklistStatus?: MontageChecklistStatus | undefined
  assignedTables: readonly MontageAssignmentViewModel[]
  freeTables: readonly EventTableViewModel[]
  onAssignTable: (request: AssignTableRequest) => void
  onReleaseAssignment: (request: ReleaseAssignmentRequest) => void
}

/**
 * The business rule this whole section exists to enforce: table
 * assignment requires `checklistStatus === 'approved'`
 * (`POST /participaciones/{id}/asignaciones` → SGEB-4005 otherwise). This
 * is never presented as currently executable when the prerequisite is
 * false — no enabled select, no enabled button, just explanatory text.
 * "Liberar mesa" maps to the documented `DELETE /asignaciones/{id_asignacion}`
 * and is always available for an existing assignment (releasing is not
 * gated by checklist status). No "change table" action exists — moving a
 * mesero is only ever release-then-assign, matching the two separate
 * documented endpoints (no single "change" operation is documented).
 */
export function EventMontageAssignmentSection({
  idParticipacion,
  nombreParticipante,
  checklistStatus,
  assignedTables,
  freeTables,
  onAssignTable,
  onReleaseAssignment,
}: EventMontageAssignmentSectionProps) {
  const [selectedMesaId, setSelectedMesaId] = useState('')
  const selectId = useId()

  const isApproved = checklistStatus === 'approved'

  return (
    <div className="flex flex-col gap-2">
      {assignedTables.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {assignedTables.map((assignment) => (
            <li
              key={assignment.idAsignacion}
              className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-1.5"
            >
              <Badge tone="success">{assignment.mesa.etiqueta}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Liberar ${assignment.mesa.etiqueta} de ${nombreParticipante}`}
                onClick={() =>
                  onReleaseAssignment({ idAsignacion: assignment.idAsignacion })
                }
              >
                Liberar mesa
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Text size="sm" className="text-muted-foreground">
          Sin mesa asignada.
        </Text>
      )}

      {!isApproved ? (
        <Text size="sm" className="text-muted-foreground">
          Requiere aprobar el checklist de montaje de este mesero antes de asignar una
          mesa.
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
    </div>
  )
}
