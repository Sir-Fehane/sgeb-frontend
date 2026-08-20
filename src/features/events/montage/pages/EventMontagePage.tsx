import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { useMesasQuery } from '@/features/events/queries/useMesasQuery'
import { useAsignacionesQuery } from '@/features/events/queries/useAsignacionesQuery'
import { EventMontageContent } from '@/features/events/montage/components/EventMontageContent'
import { useApproveChecklistMutation } from '@/features/events/montage/queries/useApproveChecklistMutation'
import { useAssignTableMutation } from '@/features/events/montage/queries/useAssignTableMutation'
import { useReleaseAssignmentMutation } from '@/features/events/montage/queries/useReleaseAssignmentMutation'
import { useMontageChecklistInstanciaQueries } from '@/features/events/montage/queries/useMontageChecklistInstanciaQueries'
import { useMontageChecklistTemplatesQuery } from '@/features/events/montage/queries/useMontageChecklistTemplatesQuery'
import { useMontageParticipantsQuery } from '@/features/events/montage/queries/useMontageParticipantsQuery'
import { buildMontageChecklist } from '@/features/events/montage/services/montageApi'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  ChecklistApprovalStatus,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { deriveMontageAssignments } from '@/features/events/montage/utils/deriveMontageAssignments'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Toast } from '@/shared/components'
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

/** One floating `Toast`'s worth of copy for whichever assign/release mutation most recently succeeded — mirrors `EventDetailComandaSection`'s `ComandaFeedback`. */
interface MontageFeedback {
  title: string
  body: string
}

/**
 * Routed at /eventos/:id/montaje (W-07 "Verificar montaje + asignar
 * mesas"). Fully live: roster + checklist read/approve
 * (`feature/montage-live-integration`), plus real table assignment —
 * `GET /eventos/{id}/asignaciones`, `GET /eventos/{id}/mesas`,
 * `POST /participaciones/{id}/asignaciones`, `DELETE /asignaciones/{id}`
 * (`feature/event-operations-live`). See `types/montage.ts`'s module
 * comment for the exact endpoint list and the one deliberately read-only
 * boundary (`vincular`, mesero/QR-device-only).
 *
 * The mesas/asignaciones queries are handled as a section-scoped
 * loading/error concern (`EventMontageTablesSection`'s own props), not
 * folded into this page's top-level gate — a failure reading table state
 * should not take down the checklist/roster half of the screen, which is
 * independently useful to a captain even if the tables section is
 * temporarily broken.
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

  const mesasQuery = useMesasQuery(idEvento)
  const asignacionesQuery = useAsignacionesQuery(idEvento)
  const assignTableMutation = useAssignTableMutation(idEvento ?? -1)
  const releaseAssignmentMutation = useReleaseAssignmentMutation(idEvento ?? -1)

  const [checklistApprovalStatuses, setChecklistApprovalStatuses] = useState<
    Record<number, ChecklistApprovalStatus>
  >({})
  const [checklistApprovalErrors, setChecklistApprovalErrors] = useState<
    Record<number, string>
  >({})

  const [assignStatuses, setAssignStatuses] = useState<
    Record<number, 'assigning' | 'error'>
  >({})
  const [assignErrors, setAssignErrors] = useState<Record<number, string>>({})
  const [releaseStatuses, setReleaseStatuses] = useState<
    Record<number, 'releasing' | 'error'>
  >({})
  const [releaseErrors, setReleaseErrors] = useState<Record<number, string>>({})

  const [montageFeedback, setMontageFeedback] = useState<MontageFeedback | null>(null)

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

  const tablesLoading = mesasQuery.isPending || asignacionesQuery.isPending
  const tablesErrorMessage =
    mesasQuery.isError || asignacionesQuery.isError
      ? toSafeErrorMessage(mesasQuery.error ?? asignacionesQuery.error)
      : undefined

  const templatesById = new Map(
    (templatesQuery.data ?? []).map((template) => [template.idChecklist, template]),
  )

  const { tables, currentAssignmentByParticipation } = deriveMontageAssignments(
    participantsQuery.data ?? [],
    mesasQuery.data ?? [],
    asignacionesQuery.data ?? [],
  )

  const participants: MontageParticipantViewModel[] = (participantsQuery.data ?? []).map(
    (participant, index) => {
      const checklist = buildMontageChecklist(
        checklistInstanciaQueries[index]?.data ?? [],
        templatesById,
        participant.checklistOk,
      )
      const currentAssignment = currentAssignmentByParticipation.get(
        participant.idParticipacion,
      )
      return {
        idParticipacion: participant.idParticipacion,
        nombre: participant.nombre,
        puesto: participant.puesto,
        estado: participant.estado,
        ...(checklist ? { checklist } : {}),
        ...(currentAssignment ? { currentAssignment } : {}),
      }
    },
  )

  function handleRetry() {
    void eventDetailQuery.refetch()
    void participantsQuery.refetch()
    void templatesQuery.refetch()
    checklistInstanciaQueries.forEach((query) => void query.refetch())
  }

  function handleRetryTables() {
    void mesasQuery.refetch()
    void asignacionesQuery.refetch()
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

  function handleAssignTable(request: AssignTableRequest) {
    const { idParticipacion } = request
    if (assignStatuses[idParticipacion] === 'assigning') {
      return
    }

    setAssignStatuses((previous) => ({ ...previous, [idParticipacion]: 'assigning' }))
    setAssignErrors((previous) => {
      if (!(idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[idParticipacion]
      return next
    })
    setMontageFeedback(null)

    assignTableMutation.mutate(request, {
      onSuccess: () => {
        setAssignStatuses((previous) => {
          const next = { ...previous }
          delete next[idParticipacion]
          return next
        })
        setMontageFeedback({
          title: 'Mesa asignada',
          body: 'La mesa se asignó correctamente.',
        })
      },
      onError: (error) => {
        setAssignStatuses((previous) => ({ ...previous, [idParticipacion]: 'error' }))
        setAssignErrors((previous) => ({
          ...previous,
          [idParticipacion]: toSafeErrorMessage(error),
        }))
      },
    })
  }

  function handleReleaseAssignment(request: ReleaseAssignmentRequest) {
    const { idParticipacion } = request
    if (releaseStatuses[idParticipacion] === 'releasing') {
      return
    }

    setReleaseStatuses((previous) => ({ ...previous, [idParticipacion]: 'releasing' }))
    setReleaseErrors((previous) => {
      if (!(idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[idParticipacion]
      return next
    })
    setMontageFeedback(null)

    releaseAssignmentMutation.mutate(request, {
      onSuccess: () => {
        setReleaseStatuses((previous) => {
          const next = { ...previous }
          delete next[idParticipacion]
          return next
        })
        setMontageFeedback({
          title: 'Mesa liberada',
          body: 'La mesa quedó disponible para reasignarla.',
        })
      },
      onError: (error) => {
        setReleaseStatuses((previous) => ({ ...previous, [idParticipacion]: 'error' }))
        setReleaseErrors((previous) => ({
          ...previous,
          [idParticipacion]: toSafeErrorMessage(error),
        }))
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {montageFeedback ? (
        <Toast title={montageFeedback.title} onDismiss={() => setMontageFeedback(null)}>
          <p>{montageFeedback.body}</p>
        </Toast>
      ) : null}

      <EventMontageContent
        evento={evento}
        isLoading={isLoading}
        {...(errorMessage ? { errorMessage } : {})}
        onRetry={handleRetry}
        participants={participants}
        tables={tables}
        tablesLoading={tablesLoading}
        {...(tablesErrorMessage ? { tablesErrorMessage } : {})}
        onRetryTables={handleRetryTables}
        checklistApprovalStatuses={checklistApprovalStatuses}
        checklistApprovalErrorMessages={checklistApprovalErrors}
        assignStatuses={assignStatuses}
        assignErrorMessages={assignErrors}
        releaseStatuses={releaseStatuses}
        releaseErrorMessages={releaseErrors}
        onApproveChecklist={handleApproveChecklist}
        onAssignTable={handleAssignTable}
        onReleaseAssignment={handleReleaseAssignment}
      />
    </div>
  )
}
