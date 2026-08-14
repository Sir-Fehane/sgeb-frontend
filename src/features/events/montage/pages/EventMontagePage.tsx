import { IconInfoCircle } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { EventMontageContent } from '@/features/events/montage/components/EventMontageContent'
import { findMontageTables } from '@/features/events/montage/fixtures/montageFixtures'
import { useApproveChecklistMutation } from '@/features/events/montage/queries/useApproveChecklistMutation'
import { useMontageChecklistInstanciaQueries } from '@/features/events/montage/queries/useMontageChecklistInstanciaQueries'
import { useMontageChecklistTemplatesQuery } from '@/features/events/montage/queries/useMontageChecklistTemplatesQuery'
import { useMontageParticipantsQuery } from '@/features/events/montage/queries/useMontageParticipantsQuery'
import { buildMontageChecklist } from '@/features/events/montage/services/montageApi'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  ChecklistApprovalStatus,
  EventTableViewModel,
  MontageAssignmentViewModel,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Alert, Text } from '@/shared/components'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — same helper as `EventDetailPage`/
 * `TeamSelectionPage`/`EventAttendancePage` (duplicated locally per those
 * files' own comments: CLAUDE.md prefers this over a premature cross-page
 * abstraction).
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el montaje.'
}

/**
 * Routed at /eventos/:id/montaje (W-07 "Verificar montaje + asignar
 * mesas"). LIVE wiring for the roster + checklist read/approve; the table
 * availability/assignment section stays FOUNDATION-ONLY, local component
 * state — see `types/montage.ts`'s module comment for the confirmed
 * backend gap this is working around (no endpoint exists to read existing
 * table assignments, and `mesa.estado` never reflects a captain's
 * assignment, only the mesero's later physical QR scan). `handleAssignTable`/
 * `handleReleaseAssignment` below never call the network — same local logic
 * as before this branch, just re-keyed onto the live roster's real
 * `idParticipacion` values.
 */
export function EventMontagePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)

  const eventDetailQuery = useEventDetailQuery(idEvento)
  const participantsQuery = useMontageParticipantsQuery(idEvento)
  const templatesQuery = useMontageChecklistTemplatesQuery(idEvento)
  const participationIds = participantsQuery.data?.map((p) => p.idParticipacion) ?? []
  const checklistInstanciaQueries = useMontageChecklistInstanciaQueries(participationIds)
  const approveChecklistMutation = useApproveChecklistMutation(idEvento ?? -1)

  const [tables, setTables] = useState<EventTableViewModel[]>(() =>
    idEvento === null ? [] : findMontageTables(idEvento).map((mesa) => ({ ...mesa })),
  )
  const [assignedTablesByParticipation, setAssignedTablesByParticipation] = useState<
    Record<number, MontageAssignmentViewModel[]>
  >({})
  const nextAssignmentId = useRef(1000)

  const [checklistApprovalStatuses, setChecklistApprovalStatuses] = useState<
    Record<number, ChecklistApprovalStatus>
  >({})
  const [checklistApprovalErrors, setChecklistApprovalErrors] = useState<
    Record<number, string>
  >({})

  const notFound = idEvento === null || isEventoNotFoundError(eventDetailQuery.error)
  const evento = notFound ? null : (eventDetailQuery.data ?? null)

  const isLoading =
    idEvento !== null &&
    (eventDetailQuery.isPending ||
      participantsQuery.isPending ||
      templatesQuery.isPending ||
      checklistInstanciaQueries.some((query) => query.isPending))

  const hasRealError =
    idEvento !== null &&
    !notFound &&
    (eventDetailQuery.isError ||
      participantsQuery.isError ||
      templatesQuery.isError ||
      checklistInstanciaQueries.some((query) => query.isError))

  const errorMessage = hasRealError
    ? toSafeErrorMessage(
        eventDetailQuery.error ??
          participantsQuery.error ??
          templatesQuery.error ??
          checklistInstanciaQueries.find((query) => query.isError)?.error,
      )
    : undefined

  const templatesById = new Map(
    (templatesQuery.data ?? []).map((template) => [template.idChecklist, template]),
  )

  const participants: MontageParticipantViewModel[] = (participantsQuery.data ?? []).map(
    (participant, index) => {
      const checklist = buildMontageChecklist(
        checklistInstanciaQueries[index]?.data ?? [],
        templatesById,
        participant.checklistOk,
      )
      return {
        idParticipacion: participant.idParticipacion,
        nombre: participant.nombre,
        puesto: participant.puesto,
        ...(checklist ? { checklist } : {}),
        assignedTables: assignedTablesByParticipation[participant.idParticipacion] ?? [],
      }
    },
  )

  function handleRetry() {
    void eventDetailQuery.refetch()
    void participantsQuery.refetch()
    void templatesQuery.refetch()
    checklistInstanciaQueries.forEach((query) => void query.refetch())
  }

  function handleApproveChecklist({
    idParticipacion,
    idChecklistInstancia,
  }: ApproveChecklistRequest) {
    if (checklistApprovalStatuses[idParticipacion] === 'approving') {
      return
    }

    setChecklistApprovalStatuses((previous) => ({
      ...previous,
      [idParticipacion]: 'approving',
    }))
    setChecklistApprovalErrors((previous) => {
      if (!(idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[idParticipacion]
      return next
    })

    approveChecklistMutation.mutate(idChecklistInstancia, {
      onSuccess: () => {
        setChecklistApprovalStatuses((previous) => ({
          ...previous,
          [idParticipacion]: 'idle',
        }))
      },
      onError: (error) => {
        setChecklistApprovalStatuses((previous) => ({
          ...previous,
          [idParticipacion]: 'error',
        }))
        setChecklistApprovalErrors((previous) => ({
          ...previous,
          [idParticipacion]: toSafeErrorMessage(error),
        }))
      },
    })
  }

  /**
   * FOUNDATION-ONLY — never calls the network. Same local logic as before
   * this branch (see `types/montage.ts`'s module comment for why). Local
   * assignment ids are minted from a counter starting well above any
   * fixture-seeded id, standing in for the real server/DB-generated
   * `id_asignacion` this screen never receives, since there is no live
   * mutation call to receive one from.
   */
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
    setAssignedTablesByParticipation((previous) => ({
      ...previous,
      [idParticipacion]: [
        ...(previous[idParticipacion] ?? []),
        { idAsignacion, mesa: mesaAsignada },
      ],
    }))
  }

  /** FOUNDATION-ONLY — never calls the network. See `handleAssignTable` above. */
  function handleReleaseAssignment({ idAsignacion }: ReleaseAssignmentRequest) {
    const ownerEntry = Object.entries(assignedTablesByParticipation).find(([, list]) =>
      list.some((a) => a.idAsignacion === idAsignacion),
    )
    if (!ownerEntry) {
      return
    }
    const [ownerIdRaw, list] = ownerEntry
    const ownerId = Number(ownerIdRaw)
    const assignment = list.find((a) => a.idAsignacion === idAsignacion)
    if (!assignment) {
      return
    }
    const idMesa = assignment.mesa.idMesa

    setTables((previous) =>
      previous.map((m) => (m.idMesa === idMesa ? { ...m, estado: 'libre' } : m)),
    )
    setAssignedTablesByParticipation((previous) => ({
      ...previous,
      [ownerId]: (previous[ownerId] ?? []).filter((a) => a.idAsignacion !== idAsignacion),
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Asignación de mesas: panel de demostración"
      >
        <Text size="sm">
          El checklist de montaje y los meseros mostrados arriba son datos reales de este
          evento. La asignación y liberación de mesas, en cambio, sigue usando datos de
          desarrollo (<code>features/events/montage/fixtures</code>): no envía ninguna
          solicitud al servidor ni se conserva al recargar la página. El backend todavía
          no expone una forma de consultar qué mesas ya asignó el capitán, así que esta
          sección se mantiene como fundación hasta que ese endpoint exista.
        </Text>
      </Alert>

      <EventMontageContent
        evento={evento}
        isLoading={isLoading}
        {...(errorMessage ? { errorMessage } : {})}
        onRetry={handleRetry}
        participants={participants}
        tables={tables}
        checklistApprovalStatuses={checklistApprovalStatuses}
        checklistApprovalErrorMessages={checklistApprovalErrors}
        onApproveChecklist={handleApproveChecklist}
        onAssignTable={handleAssignTable}
        onReleaseAssignment={handleReleaseAssignment}
      />
    </div>
  )
}
