import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { useMesasQuery } from '@/features/events/queries/useMesasQuery'
import { useAsignacionesQuery } from '@/features/events/queries/useAsignacionesQuery'
import { EventMontageContent } from '@/features/events/montage/components/EventMontageContent'
import { EventMontageForbiddenState } from '@/features/events/montage/components/EventMontageForbiddenState'
import { useApproveChecklistMutation } from '@/features/events/montage/queries/useApproveChecklistMutation'
import { useAssignTableMutation } from '@/features/events/montage/queries/useAssignTableMutation'
import { useReleaseAssignmentMutation } from '@/features/events/montage/queries/useReleaseAssignmentMutation'
import { useInstantiateChecklistMutation } from '@/features/events/montage/queries/useInstantiateChecklistMutation'
import { useMontageChecklistInstanciaQueries } from '@/features/events/montage/queries/useMontageChecklistInstanciaQueries'
import { useMontageChecklistTemplatesQuery } from '@/features/events/montage/queries/useMontageChecklistTemplatesQuery'
import { useMontageParticipantsQuery } from '@/features/events/montage/queries/useMontageParticipantsQuery'
import { buildMontageChecklist } from '@/features/events/montage/services/montageApi'
import type {
  ApproveChecklistRequest,
  AssignTableRequest,
  ChecklistApprovalStatus,
  ChecklistInstantiationStatus,
  InstantiateChecklistRequest,
  MontageParticipantViewModel,
  ReleaseAssignmentRequest,
} from '@/features/events/montage/types/montage'
import { deriveMontageAssignments } from '@/features/events/montage/utils/deriveMontageAssignments'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { Toast } from '@/shared/components'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

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
 *
 * Role gate (`feature/checklist-flow-alignment`, final role/scope
 * verification): this is the CAPTAIN'S WEB VIEW per this feature's own
 * `types/montage.ts` module comment — a `mesero` session never
 * legitimately reaches it (the native iOS app is the mesero product,
 * same reasoning `MenuPage`/`ChecklistsPage` already apply to their own
 * routes). `canView` is computed first and threaded into every query hook
 * below as `effectiveIdEvento` (`canView ? idEvento : null`), reusing the
 * exact `idEvento === null → skipToken` guard every one of these hooks
 * already implements for a malformed route id — so a non-`capitán`/`admin`
 * session fires zero requests (roster, checklist instances/templates,
 * mesas, asignaciones, the realtime room join), not just a hidden button.
 * The mutations (`approve`/`instantiate`/`assign`/`release`) need no
 * separate gate: they are inert until a handler calls `.mutate()`, and
 * `EventMontageForbiddenState` replaces every control that could do that.
 */
export function EventMontagePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)

  const session = useOidcSessionStore((state) => state.session)
  const canView =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')
  const effectiveIdEvento = canView ? idEvento : null

  useEventRealtimeRoom(effectiveIdEvento)

  const eventDetailQuery = useEventDetailQuery(effectiveIdEvento)
  const participantsQuery = useMontageParticipantsQuery(effectiveIdEvento)
  const templatesQuery = useMontageChecklistTemplatesQuery(effectiveIdEvento)
  const participationIds = participantsQuery.data?.map((p) => p.idParticipacion) ?? []
  const checklistInstanciaQueries = useMontageChecklistInstanciaQueries(participationIds)
  const approveChecklistMutation = useApproveChecklistMutation(effectiveIdEvento ?? -1)
  const instantiateChecklistMutation = useInstantiateChecklistMutation()

  const mesasQuery = useMesasQuery(effectiveIdEvento)
  const asignacionesQuery = useAsignacionesQuery(effectiveIdEvento)
  const assignTableMutation = useAssignTableMutation(effectiveIdEvento ?? -1)
  const releaseAssignmentMutation = useReleaseAssignmentMutation(effectiveIdEvento ?? -1)

  const [checklistApprovalStatuses, setChecklistApprovalStatuses] = useState<
    Record<number, ChecklistApprovalStatus>
  >({})
  const [checklistApprovalErrors, setChecklistApprovalErrors] = useState<
    Record<number, string>
  >({})

  const [checklistInstantiationStatuses, setChecklistInstantiationStatuses] = useState<
    Record<number, ChecklistInstantiationStatus>
  >({})
  const [checklistInstantiationErrors, setChecklistInstantiationErrors] = useState<
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

  /**
   * Every hook above is already called unconditionally (including the
   * skipped, `effectiveIdEvento === null` queries) — this early return only
   * selects what to render, so it stays clear of the Rules of Hooks. It
   * must come before `isLoading`'s own `idEvento !== null` check: a
   * skipped query stays `pending` forever (see `useEventDetailQuery`'s own
   * comment), so without this early return a non-`capitán`/`admin` session
   * would see an infinite loading skeleton instead of a clear forbidden
   * state.
   */
  if (!canView) {
    return <EventMontageForbiddenState />
  }

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

  function handleInstantiateChecklist({
    idParticipacion,
    idChecklist,
  }: InstantiateChecklistRequest) {
    if (checklistInstantiationStatuses[idParticipacion] === 'instantiating') {
      return
    }

    setChecklistInstantiationStatuses((previous) => ({
      ...previous,
      [idParticipacion]: 'instantiating',
    }))
    setChecklistInstantiationErrors((previous) => {
      if (!(idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[idParticipacion]
      return next
    })

    instantiateChecklistMutation.mutate(
      { idParticipacion, idChecklist },
      {
        onSuccess: () => {
          setChecklistInstantiationStatuses((previous) => ({
            ...previous,
            [idParticipacion]: 'idle',
          }))
        },
        onError: (error) => {
          setChecklistInstantiationStatuses((previous) => ({
            ...previous,
            [idParticipacion]: 'error',
          }))
          setChecklistInstantiationErrors((previous) => ({
            ...previous,
            [idParticipacion]: toSafeErrorMessage(error),
          }))
        },
      },
    )
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
        availableChecklistTemplates={templatesQuery.data ?? []}
        checklistInstantiationStatuses={checklistInstantiationStatuses}
        checklistInstantiationErrorMessages={checklistInstantiationErrors}
        onInstantiateChecklist={handleInstantiateChecklist}
      />
    </div>
  )
}
