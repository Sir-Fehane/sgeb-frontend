import { useParams } from 'react-router-dom'

import { EventDetailContent } from '@/features/events/components/EventDetailContent'
import type { EventDetailComandaSectionProps } from '@/features/events/components/EventDetailComandaSection'
import { useComandaQuery } from '@/features/events/queries/useComandaQuery'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { useOpenComandaMutation } from '@/features/events/queries/useOpenComandaMutation'
import { useRetireComandaMutation } from '@/features/events/queries/useRetireComandaMutation'
import { useUploadComandaMutation } from '@/features/events/queries/useUploadComandaMutation'
import { isComandaNotFoundError } from '@/features/events/services/comandaApi'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — mirrors `EventsPage`'s own
 * `toSafeErrorMessage` (docs/FrontendArchitecture.md §4.1). Duplicated
 * locally rather than shared: two call sites, both feature-local, and
 * CLAUDE.md prefers this over a premature cross-page abstraction.
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el evento.'
}

/**
 * Routed at /eventos/:id. Live wiring layer around `EventDetailContent`,
 * mirroring `EventsPage`'s relationship to `EventsContent`.
 *
 * The route param is validated (`parseEventId`) before anything else — a
 * malformed id (empty, zero, negative, decimal, non-numeric, unsafe
 * integer) never reaches the network; `useEventDetailQuery` receives
 * `null` and skips the request entirely (`skipToken`), and this page
 * renders the existing "not found" state immediately rather than reading
 * that skipped query's (permanently pending) status.
 *
 * A well-formed id that the backend doesn't recognize resolves to the
 * same "not found" state: `SGEB-3001` (`isEventoNotFoundError`) is mapped
 * to `evento: null` rather than `errorMessage`, reusing
 * `EventDetailUnavailableState` — the malformed-id case and the
 * genuinely-missing-event case are presented identically, exactly as the
 * fixture-backed foundation already did.
 *
 * Team Selection, Attendance, Montage, Closure, and Payments stay exactly
 * as this foundation already built them (`EventDetailRoadmapSection`) —
 * this branch replaces the source of `evento` and rebuilds Comanda
 * (`EventDetailComandaSection`) against the real 5-endpoint contract
 * (`docs/decisions.md` ADR-007): live metadata (`GET /comanda`, its own
 * query — kept separate from `evento`, see `SGEB_CODE`/`comandaQueryKeys`
 * comments), safe open/view, upload, and replace/retire. History/restore
 * are deliberately out of scope this branch.
 */
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const detailQuery = useEventDetailQuery(idEvento)

  const notFound = idEvento === null || isEventoNotFoundError(detailQuery.error)
  const evento = notFound ? null : (detailQuery.data ?? null)
  const isLoading = idEvento !== null && detailQuery.isPending
  const hasRealError = idEvento !== null && detailQuery.isError && !notFound

  const comandaQuery = useComandaQuery(idEvento)
  const comandaNotFound = idEvento === null || isComandaNotFoundError(comandaQuery.error)
  const comandaData = comandaNotFound ? null : (comandaQuery.data ?? null)
  const comandaIsLoading = idEvento !== null && comandaQuery.isPending
  const comandaHasRealError =
    idEvento !== null && comandaQuery.isError && !comandaNotFound

  const uploadComandaMutation = useUploadComandaMutation(idEvento ?? -1)
  const retireComandaMutation = useRetireComandaMutation(idEvento ?? -1)
  const openComandaMutation = useOpenComandaMutation(idEvento ?? -1)

  /**
   * UX-only role gate — sourced from the real, already-authenticated OIDC
   * session (`rol` claim, per `types/userInfo.ts`), never a fabricated or
   * assumed value. See `EventDetailComandaSection`'s own `canManage`
   * comment for why this cannot and does not compensate for the pinned
   * backend's confirmed write-path ownership gap.
   */
  const session = useOidcSessionStore((state) => state.session)
  const canManageComanda =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  async function handleOpenComanda(signal: AbortSignal, tab: Window | null) {
    await openComandaMutation.mutateAsync({ signal, tab })
  }

  async function handleUploadComanda(file: File) {
    await uploadComandaMutation.mutateAsync(file)
  }

  async function handleRetireComanda() {
    await retireComandaMutation.mutateAsync()
  }

  const comandaSectionProps: EventDetailComandaSectionProps = {
    comanda: comandaData,
    isLoading: comandaIsLoading,
    canManage: canManageComanda,
    onOpen: handleOpenComanda,
    onUpload: handleUploadComanda,
    onRetire: handleRetireComanda,
    ...(comandaHasRealError
      ? { errorMessage: toSafeErrorMessage(comandaQuery.error) }
      : {}),
  }

  return (
    <div className="flex flex-col gap-6">
      <EventDetailContent
        evento={evento}
        isLoading={isLoading}
        {...(hasRealError ? { errorMessage: toSafeErrorMessage(detailQuery.error) } : {})}
        onRetry={() => void detailQuery.refetch()}
        comanda={comandaSectionProps}
      />
    </div>
  )
}
