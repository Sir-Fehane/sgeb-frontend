import { IconInfoCircle } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { findEventDetailFixture } from '@/features/events/fixtures/eventDetailFixtures'
import { EventMontageContent } from '@/features/events/montage/components/EventMontageContent'
import {
  findMontageParticipants,
  findMontageTables,
} from '@/features/events/montage/fixtures/montageFixtures'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  EventTableViewModel,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /eventos/:id/montaje (W-07 "Verificar montaje + asignar
 * mesas"). Entirely presentation-only, exactly like `TeamSelectionPage`:
 * `findMontageParticipants`/`findMontageTables` are development/demo data,
 * never real `GET /participaciones/{id}/checklist-instancias` or
 * `GET /eventos/{id}/mesas` responses. No Axios, no TanStack Query, no
 * network request of any kind.
 *
 * The three handlers below model only the exact documented captain
 * actions, entirely in local component state, never persisted:
 * - `handleApproveChecklist` → `PATCH /checklist-instancias/{id}/aprobar`.
 *   Only ever transitions a checklist from `'completed'` to `'approved'` —
 *   mirrors SGEB-4005 ("checklist incompleto no puede aprobarse") by
 *   construction, never a captain override.
 * - `handleAssignTable` → `POST /participaciones/{id}/asignaciones` with
 *   exactly `{id_mesa}`. Only proceeds when that participant's checklist
 *   is approved and the chosen mesa is `libre` — mirrors SGEB-4005/SGEB-4006.
 * - `handleReleaseAssignment` → `DELETE /asignaciones/{id_asignacion}`, a
 *   real documented captain-owned action, returning the mesa to `libre`.
 *
 * Local assignment ids are minted from a counter starting well above any
 * fixture-seeded id — a demo-only identifier standing in for the real
 * server/DB-generated, autoincremental `id_asignacion` (never
 * client-editable per the data dictionary). It is never sent as part of
 * `AssignTableRequest` (the documented `POST` body is `id_mesa` only) and
 * this whole counter would be deleted during live integration, replaced
 * by whatever id the real `POST /participaciones/{id}/asignaciones`
 * response returns (see `types/montage.ts` for the full contract note).
 */
export function EventMontagePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const evento = idEvento === null ? null : findEventDetailFixture(idEvento)

  const [participants, setParticipants] = useState<MontageParticipantViewModel[]>(() =>
    idEvento === null
      ? []
      : findMontageParticipants(idEvento).map((participant) => ({
          ...participant,
          assignedTables: [...participant.assignedTables],
        })),
  )
  const [tables, setTables] = useState<EventTableViewModel[]>(() =>
    idEvento === null ? [] : findMontageTables(idEvento).map((mesa) => ({ ...mesa })),
  )
  const nextAssignmentId = useRef(1000)

  function handleApproveChecklist({
    idParticipacion,
    idChecklistInstancia,
  }: ApproveChecklistRequest) {
    setParticipants((previous) =>
      previous.map((participant) => {
        if (
          participant.idParticipacion !== idParticipacion ||
          participant.checklist?.idChecklistInstancia !== idChecklistInstancia ||
          participant.checklist.status !== 'completed'
        ) {
          return participant
        }
        return {
          ...participant,
          checklist: { ...participant.checklist, status: 'approved' },
        }
      }),
    )
  }

  function handleAssignTable({ idParticipacion, idMesa }: AssignTableRequest) {
    const participant = participants.find((p) => p.idParticipacion === idParticipacion)
    const mesa = tables.find((m) => m.idMesa === idMesa)
    if (!participant || participant.checklist?.status !== 'approved') {
      return
    }
    if (mesa?.estado !== 'libre') {
      return
    }

    const idAsignacion = nextAssignmentId.current
    nextAssignmentId.current += 1
    const mesaAsignada: EventTableViewModel = { ...mesa, estado: 'ocupada' }

    setTables((previous) => previous.map((m) => (m.idMesa === idMesa ? mesaAsignada : m)))
    setParticipants((previous) =>
      previous.map((p) =>
        p.idParticipacion === idParticipacion
          ? {
              ...p,
              assignedTables: [...p.assignedTables, { idAsignacion, mesa: mesaAsignada }],
            }
          : p,
      ),
    )
  }

  function handleReleaseAssignment({ idAsignacion }: ReleaseAssignmentRequest) {
    const owner = participants.find((p) =>
      p.assignedTables.some((a) => a.idAsignacion === idAsignacion),
    )
    const assignment = owner?.assignedTables.find((a) => a.idAsignacion === idAsignacion)
    if (!owner || !assignment) {
      return
    }
    const idMesa = assignment.mesa.idMesa

    setTables((previous) =>
      previous.map((m) => (m.idMesa === idMesa ? { ...m, estado: 'libre' } : m)),
    )
    setParticipants((previous) =>
      previous.map((p) =>
        p.idParticipacion === owner.idParticipacion
          ? {
              ...p,
              assignedTables: p.assignedTables.filter(
                (a) => a.idAsignacion !== idAsignacion,
              ),
            }
          : p,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          El montaje mostrado usa datos de desarrollo (
          <code>features/events/montage/fixtures</code>), no información real. Aprobar un
          checklist o asignar/liberar una mesa aquí no envía ninguna solicitud ni se
          conserva al recargar la página.
        </Text>
      </Alert>

      <EventMontageContent
        evento={evento}
        isLoading={false}
        participants={participants}
        tables={tables}
        onApproveChecklist={handleApproveChecklist}
        onAssignTable={handleAssignTable}
        onReleaseAssignment={handleReleaseAssignment}
      />
    </div>
  )
}
