import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { TeamSelectionContent } from '@/features/events/team-selection/components/TeamSelectionContent'
import { useSelectParticipantMutation } from '@/features/events/team-selection/queries/useSelectParticipantMutation'
import { useTeamSelectionParticipantsQuery } from '@/features/events/team-selection/queries/useTeamSelectionParticipantsQuery'
import type {
  SelectParticipantRequest,
  TeamSelectionRowStatus,
} from '@/features/events/team-selection/types/teamSelection'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

/**
 * Never renders `technical_message` — same helper as `EventDetailPage`/
 * `EventsPage` (duplicated locally per those files' own comments: two more
 * call sites, both feature-local, CLAUDE.md prefers this over a premature
 * cross-page abstraction).
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el equipo.'
}

/**
 * Routed at /eventos/:id/equipo (W-05 "Seleccionar equipo") — `capitán`/
 * `admin` only on this frontend: the pinned backend's own
 * `PATCH /participaciones/{id}/estado` (this screen's core write action) is
 * `middleware.rol(['capitan', 'admin'])`, and a `mesero` session never uses
 * this web console at all (native iOS app, docs/FrontendArchitecture.md
 * §2/§10.3). `canView` is the route-level backstop for a direct
 * `/eventos/:id/equipo` visit — `TeamSelectionContent` renders
 * `TeamSelectionForbiddenState` instead of the real roster, and
 * `eventDetailQuery`/`participantsQuery` are only given the real
 * `idEvento` when `canView` is true (`skipToken` otherwise, via
 * `useEventDetailQuery`/`useTeamSelectionParticipantsQuery`'s existing
 * `idEvento: null` convention) so neither request ever fires for a `mesero`
 * session — same "avoid firing queries the role can't act on" goal
 * `UsersPage`/`WaitersPage` already establish via an explicit `enabled` flag.
 *
 * Live wiring layer around `TeamSelectionContent`, mirroring
 * `EventDetailPage`'s relationship to `EventDetailContent`.
 *
 * Reuses `useEventDetailQuery` for the event header/cupo context instead
 * of a second, independent fetch — same query key as the Event Detail
 * page, so navigating here from an already-visited event reuses that
 * cache entry rather than duplicating the request.
 *
 * The roster (`GET /eventos/{id}/participaciones`) never 404s for an
 * unknown event — the pinned backend's `listarPorEvento` has no event
 * existence check and simply returns an empty array — so "not found" is
 * driven entirely by the event detail query, exactly as `EventDetailPage`
 * already does.
 *
 * `rowStatuses`/`rowErrors` are local, per-row UI state for the in-flight
 * selection action — never a mirror of server data. On success, the
 * mutation invalidates the roster query; the real refetch (not an
 * optimistic guess) is what actually moves a row from candidates to
 * selected.
 */
export function TeamSelectionPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  useEventRealtimeRoom(idEvento)

  const session = useOidcSessionStore((state) => state.session)
  const canView =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  const eventDetailQuery = useEventDetailQuery(canView ? idEvento : null)
  const participantsQuery = useTeamSelectionParticipantsQuery(canView ? idEvento : null)
  const selectParticipantMutation = useSelectParticipantMutation(idEvento ?? -1)

  const [rowStatuses, setRowStatuses] = useState<Record<number, TeamSelectionRowStatus>>(
    {},
  )
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  const notFound = idEvento === null || isEventoNotFoundError(eventDetailQuery.error)
  const evento = notFound ? null : (eventDetailQuery.data ?? null)
  const isLoading =
    canView &&
    idEvento !== null &&
    (eventDetailQuery.isPending || participantsQuery.isPending)
  const hasRealError =
    canView &&
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

  function handleSelectParticipant(request: SelectParticipantRequest) {
    if (rowStatuses[request.idParticipacion] === 'selecting') {
      return
    }

    setRowStatuses((previous) => ({
      ...previous,
      [request.idParticipacion]: 'selecting',
    }))
    setRowErrors((previous) => {
      if (!(request.idParticipacion in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[request.idParticipacion]
      return next
    })

    selectParticipantMutation.mutate(request.idParticipacion, {
      onSuccess: () => {
        setRowStatuses((previous) => ({
          ...previous,
          [request.idParticipacion]: 'selected',
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

  return (
    <TeamSelectionContent
      canView={canView}
      evento={evento}
      isLoading={isLoading}
      {...(errorMessage ? { errorMessage } : {})}
      onRetry={handleRetry}
      participants={participantsQuery.data ?? []}
      rowStatuses={rowStatuses}
      rowErrorMessages={rowErrors}
      onSelectParticipant={handleSelectParticipant}
    />
  )
}
