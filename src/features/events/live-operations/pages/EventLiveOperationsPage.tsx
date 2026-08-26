import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { LiveOperationsContent } from '@/features/events/live-operations/components/LiveOperationsContent'
import { useMarkParticipantSalidaMutation } from '@/features/events/live-operations/queries/useMarkParticipantSalidaMutation'
import { useClosureChecklistTemplatesQuery } from '@/features/events/live-operations/queries/useClosureChecklistTemplatesQuery'
import { useInstantiateClosureChecklistMutation } from '@/features/events/live-operations/queries/useInstantiateClosureChecklistMutation'
import { useApproveClosureChecklistMutation } from '@/features/events/live-operations/queries/useApproveClosureChecklistMutation'
import { buildClosureChecklist } from '@/features/events/live-operations/services/liveOperationsApi'
import type {
  ApproveClosureChecklistRequest,
  ClosureChecklistApprovalStatus,
  ClosureChecklistInstantiationStatus,
  InstantiateClosureChecklistRequest,
  LiveOperationsParticipantViewModel,
  LiveOperationsRowStatus,
  MarkParticipantSalidaRequest,
} from '@/features/events/live-operations/types/liveOperations'
import { useMontageChecklistInstanciaQueries } from '@/features/events/montage/queries/useMontageChecklistInstanciaQueries'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { useTeamSelectionParticipantsQuery } from '@/features/events/team-selection/queries/useTeamSelectionParticipantsQuery'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

/**
 * Never renders `technical_message` — same helper as `TeamSelectionPage`/
 * `EventDetailPage` (duplicated locally per those files' own comments: one
 * more call site, feature-local, CLAUDE.md prefers this over a premature
 * cross-page abstraction).
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el control de salida.'
}

/**
 * Routed at /eventos/:id/operacion-en-vivo. Live wiring layer around
 * `LiveOperationsContent`, mirroring `TeamSelectionPage`'s relationship to
 * `TeamSelectionContent`.
 *
 * Reuses `useEventDetailQuery` for the event header context instead of a
 * second, independent fetch — same query key as Event Detail/Team
 * Selection/Attendance/Montage/Closure/Payments, so navigating here from
 * an already-visited event reuses that cache entry.
 *
 * Reuses `useTeamSelectionParticipantsQuery` for the roster too, rather
 * than a second, independent `GET /eventos/{id}/participaciones` cache:
 * that query already fetches the full, authoritative
 * `TeamSelectionParticipantViewModel[]` — `{ idParticipacion, nombre,
 * puesto, estado }` over the complete 7-value `estado` enum, including
 * `vinculo`/`salida` — the exact same server collection this page's own
 * `markParticipantSalida` mutation writes to. Two independent caches over
 * one mutated resource would risk one of them holding a stale `vinculo`
 * row after the other's invalidation; see
 * `useMarkParticipantSalidaMutation`'s own comment. `LiveOperationsContent`
 * still only knows its own `LiveOperationsParticipantViewModel` type (kept
 * feature-local, per `types/liveOperations.ts`'s own comment) — the two
 * types are structurally identical by design, so no runtime mapping is
 * needed here, only the shared query.
 *
 * The roster never 404s for an unknown event — the pinned backend's
 * `listarPorEvento` has no event existence check — so "not found" is
 * driven entirely by the event detail query, exactly as `TeamSelectionPage`
 * already does.
 *
 * `rowStatuses`/`rowErrors` are local, per-row UI state for the in-flight
 * exit action — never a mirror of server data. On success, the mutation
 * invalidates the roster query (and Closure's readiness query); the real
 * refetch is what actually moves the row to its terminal presentation.
 *
 * **Exit checklist ("Verificación de limpieza") wiring** — reuses montage's
 * own live machinery rather than duplicating it: `useMontageChecklistInstanciaQueries`
 * (the `GET /participaciones/{id}/checklist-instancias` fan-out, not
 * montaje-specific at the API layer) joined against
 * `useClosureChecklistTemplatesQuery` (`GET /checklists?tipo=cierre`) via
 * `buildClosureChecklist`. Deliberately NOT folded into this page's
 * top-level `isLoading`/`errorMessage` gate, unlike montage's equivalent
 * page: a template-catalog or checklist-read hiccup degrades this specific
 * row to "no instance yet" rather than surfacing a page-wide error for one
 * participant's secondary query. This checklist gates checkout now (the
 * pinned backend authority's `SGEB-4027`, see `types/liveOperations.ts`'s
 * `ClosureChecklistViewModel` comment) — so "treat a failed/pending
 * checklist read as no instance" is no longer a merely-cosmetic
 * degradation: `isClosureChecklistApprovedForSalida` reads that same
 * `undefined` as "not satisfied" and correctly keeps "Dar salida" disabled
 * for that row until the read succeeds, rather than either blocking the
 * whole page or (worse) silently allowing checkout past a data hiccup.
 */
export function EventLiveOperationsPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  useEventRealtimeRoom(idEvento)

  const eventDetailQuery = useEventDetailQuery(idEvento)
  const participantsQuery = useTeamSelectionParticipantsQuery(idEvento)
  const markSalidaMutation = useMarkParticipantSalidaMutation(idEvento ?? -1)

  const closureTemplatesQuery = useClosureChecklistTemplatesQuery(idEvento)
  const participationIds = participantsQuery.data?.map((p) => p.idParticipacion) ?? []
  const closureChecklistInstanciaQueries =
    useMontageChecklistInstanciaQueries(participationIds)
  const instantiateClosureChecklistMutation = useInstantiateClosureChecklistMutation()
  const approveClosureChecklistMutation = useApproveClosureChecklistMutation()

  const [rowStatuses, setRowStatuses] = useState<Record<number, LiveOperationsRowStatus>>(
    {},
  )
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  const [closureChecklistApprovalStatuses, setClosureChecklistApprovalStatuses] =
    useState<Record<number, ClosureChecklistApprovalStatus>>({})
  const [closureChecklistApproveErrors, setClosureChecklistApproveErrors] = useState<
    Record<number, string>
  >({})
  const [
    closureChecklistInstantiationStatuses,
    setClosureChecklistInstantiationStatuses,
  ] = useState<Record<number, ClosureChecklistInstantiationStatus>>({})
  const [closureChecklistInstantiateErrors, setClosureChecklistInstantiateErrors] =
    useState<Record<number, string>>({})

  const notFound = idEvento === null || isEventoNotFoundError(eventDetailQuery.error)
  const evento = notFound ? null : (eventDetailQuery.data ?? null)
  const isLoading =
    idEvento !== null && (eventDetailQuery.isPending || participantsQuery.isPending)
  const hasRealError =
    idEvento !== null &&
    !notFound &&
    (eventDetailQuery.isError || participantsQuery.isError)
  const errorMessage = hasRealError
    ? toSafeErrorMessage(eventDetailQuery.error ?? participantsQuery.error)
    : undefined

  function handleRetry() {
    void eventDetailQuery.refetch()
    void participantsQuery.refetch()
  }

  function handleMarkSalida(request: MarkParticipantSalidaRequest) {
    if (rowStatuses[request.idParticipacion] === 'marking') {
      return
    }

    setRowStatuses((previous) => ({
      ...previous,
      [request.idParticipacion]: 'marking',
    }))
    setRowErrors((previous) => {
      if (!(request.idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[request.idParticipacion]
      return next
    })

    markSalidaMutation.mutate(request.idParticipacion, {
      onSuccess: () => {
        setRowStatuses((previous) => ({
          ...previous,
          [request.idParticipacion]: 'idle',
        }))
      },
      onError: (error) => {
        setRowStatuses((previous) => ({
          ...previous,
          [request.idParticipacion]: 'error',
        }))
        setRowErrors((previous) => ({
          ...previous,
          [request.idParticipacion]: toSafeErrorMessage(error),
        }))
      },
    })
  }

  function handleInstantiateClosureChecklist({
    idParticipacion,
    idChecklist,
  }: InstantiateClosureChecklistRequest) {
    if (closureChecklistInstantiationStatuses[idParticipacion] === 'instantiating') {
      return
    }

    setClosureChecklistInstantiationStatuses((previous) => ({
      ...previous,
      [idParticipacion]: 'instantiating',
    }))
    setClosureChecklistInstantiateErrors((previous) => {
      if (!(idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[idParticipacion]
      return next
    })

    instantiateClosureChecklistMutation.mutate(
      { idParticipacion, idChecklist },
      {
        onSuccess: () => {
          setClosureChecklistInstantiationStatuses((previous) => ({
            ...previous,
            [idParticipacion]: 'idle',
          }))
        },
        onError: (error) => {
          setClosureChecklistInstantiationStatuses((previous) => ({
            ...previous,
            [idParticipacion]: 'error',
          }))
          setClosureChecklistInstantiateErrors((previous) => ({
            ...previous,
            [idParticipacion]: toSafeErrorMessage(error),
          }))
        },
      },
    )
  }

  function handleApproveClosureChecklist({
    idParticipacion,
    idChecklistInstancia,
  }: ApproveClosureChecklistRequest) {
    if (closureChecklistApprovalStatuses[idParticipacion] === 'approving') {
      return
    }

    setClosureChecklistApprovalStatuses((previous) => ({
      ...previous,
      [idParticipacion]: 'approving',
    }))
    setClosureChecklistApproveErrors((previous) => {
      if (!(idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[idParticipacion]
      return next
    })

    approveClosureChecklistMutation.mutate(
      { idParticipacion, idChecklistInstancia },
      {
        onSuccess: () => {
          // Back to 'idle', not a local 'approved' — approval now persists
          // (`aprobado_en`), so the mutation's own invalidation
          // (`useApproveClosureChecklistMutation`) triggers a refetch and
          // the real `ClosureChecklistViewModel.status === 'approved'` is
          // what actually moves the badge, not this local flag.
          setClosureChecklistApprovalStatuses((previous) => ({
            ...previous,
            [idParticipacion]: 'idle',
          }))
        },
        onError: (error) => {
          setClosureChecklistApprovalStatuses((previous) => ({
            ...previous,
            [idParticipacion]: 'error',
          }))
          setClosureChecklistApproveErrors((previous) => ({
            ...previous,
            [idParticipacion]: toSafeErrorMessage(error),
          }))
        },
      },
    )
  }

  const closureTemplatesById = new Map(
    (closureTemplatesQuery.data ?? []).map((template) => [
      template.idChecklist,
      template,
    ]),
  )

  const participants: LiveOperationsParticipantViewModel[] = (
    participantsQuery.data ?? []
  ).map((participant, index) => {
    const closureChecklist = buildClosureChecklist(
      closureChecklistInstanciaQueries[index]?.data ?? [],
      closureTemplatesById,
    )
    return {
      idParticipacion: participant.idParticipacion,
      nombre: participant.nombre,
      puesto: participant.puesto,
      estado: participant.estado,
      ...(closureChecklist ? { closureChecklist } : {}),
    }
  })

  return (
    <LiveOperationsContent
      evento={evento}
      isLoading={isLoading}
      {...(errorMessage ? { errorMessage } : {})}
      onRetry={handleRetry}
      participants={participants}
      rowStatuses={rowStatuses}
      rowErrorMessages={rowErrors}
      closureChecklistApprovalStatuses={closureChecklistApprovalStatuses}
      closureChecklistApproveErrorMessages={closureChecklistApproveErrors}
      onApproveClosureChecklist={handleApproveClosureChecklist}
      availableClosureChecklistTemplates={closureTemplatesQuery.data ?? []}
      closureChecklistInstantiationStatuses={closureChecklistInstantiationStatuses}
      closureChecklistInstantiateErrorMessages={closureChecklistInstantiateErrors}
      onInstantiateClosureChecklist={handleInstantiateClosureChecklist}
      onMarkSalida={handleMarkSalida}
    />
  )
}
