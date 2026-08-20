import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { EventDetailContent } from '@/features/events/components/EventDetailContent'
import type { EventDetailComandaSectionProps } from '@/features/events/components/EventDetailComandaSection'
import type {
  EventDetailEditBundleProps,
  EventDetailLifecycleBundleProps,
} from '@/features/events/components/EventDetailContent'
import type { EventDetailMesasSectionProps } from '@/features/events/components/EventDetailMesasSection'
import { useChangeEventoEstadoMutation } from '@/features/events/queries/useChangeEventoEstadoMutation'
import { useComandaQuery } from '@/features/events/queries/useComandaQuery'
import { useCreateMesaMutation } from '@/features/events/queries/useCreateMesaMutation'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { useMesasQuery } from '@/features/events/queries/useMesasQuery'
import { useOpenComandaMutation } from '@/features/events/queries/useOpenComandaMutation'
import { useRetireComandaMutation } from '@/features/events/queries/useRetireComandaMutation'
import { useSalonQuery } from '@/features/events/queries/useSalonQuery'
import { useUpdateEventoMutation } from '@/features/events/queries/useUpdateEventoMutation'
import { useUploadComandaMutation } from '@/features/events/queries/useUploadComandaMutation'
import type { EventEditFormValues } from '@/features/events/schemas/eventEditSchema'
import type { CreateMesaFormValues } from '@/features/events/schemas/mesaCreateSchema'
import { isComandaNotFoundError } from '@/features/events/services/comandaApi'
import {
  isEventoNotFoundError,
  type UpdateEventoRequest,
} from '@/features/events/services/eventsApi'
import type { EventStatus } from '@/features/events/types/event'
import { formatSalonAddress } from '@/features/events/utils/eventDetailFormatting'
import { EVENT_STATUS_TRANSITION_TOAST_TITLES } from '@/features/events/utils/eventStatusPresentation'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { Toast } from '@/shared/components'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

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
 * as this foundation already built them (`EventDetailRoadmapSection`).
 * This branch (feature/event-lifecycle-management) adds real editing
 * (`PUT /eventos/{id}`), minimal Mesa management (`GET`/`POST
 * /eventos/{id}/mesas`), and lifecycle actions
 * (`PATCH /eventos/{id}/estado` → publish/start/return-to-draft/cancel —
 * finalization stays owned by Closure, never duplicated here).
 */
/** Shape of the one-time router state `EventCreatePage` hands off after a successful `POST /eventos`. */
interface EventDetailLocationState {
  justCreated?: boolean
}

/** One floating `Toast`'s worth of copy — a single slot for whichever page-owned action most recently succeeded, mirroring `EventDetailComandaSection`'s own `ComandaFeedback` (`Toast`'s own doc: "the caller owns showing/hiding exactly one of these at a time"). */
interface PageFeedback {
  title: string
  body?: string
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  useEventRealtimeRoom(idEvento)
  const detailQuery = useEventDetailQuery(idEvento)
  const location = useLocation()
  const navigate = useNavigate()

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

  const mesasQuery = useMesasQuery(idEvento)
  const mesasData = mesasQuery.data ?? []
  const mesasIsLoading = idEvento !== null && mesasQuery.isPending
  const mesasHasRealError = idEvento !== null && mesasQuery.isError
  const createMesaMutation = useCreateMesaMutation(idEvento ?? -1)

  const updateEventoMutation = useUpdateEventoMutation(idEvento ?? -1)
  const changeEstadoMutation = useChangeEventoEstadoMutation(idEvento ?? -1)

  const [isEditing, setIsEditing] = useState(false)

  /**
   * One-time "Evento creado" feedback — driven by React Router `state`
   * (`EventCreatePage`'s `navigate(..., { state: { justCreated: true } })`),
   * never a global store: the lazy initializer reads it exactly once, on
   * this component's first render, so it survives even though the effect
   * below clears the underlying router state on mount. Shares the same
   * `pageFeedback` slot as the lifecycle-transition toast below — never
   * two `Toast`s stacked at once.
   */
  const [pageFeedback, setPageFeedback] = useState<PageFeedback | null>(() =>
    (location.state as EventDetailLocationState | null)?.justCreated
      ? {
          title: 'Evento creado',
          body: 'El evento se creó correctamente. Ya puedes continuar con su configuración.',
        }
      : null,
  )

  useEffect(() => {
    if ((location.state as EventDetailLocationState | null)?.justCreated) {
      // Replaces this history entry's state with nothing — a same-route
      // `replace` navigation, so it neither remounts this page nor adds a
      // new back-button stop. This is what keeps an F5 reload (which
      // reuses the same history entry) from ever seeing `justCreated`
      // again, and what stops a direct visit to this URL (no `state` to
      // begin with) from ever showing it in the first place.
      void navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  // Plain refs, not `mutation.isPending` — mirrors `EventClosurePage`'s own
  // `isSubmittingRef`/`isFinalizingRef`: TanStack Query's mutation state
  // updates through its own external store and is not guaranteed to have
  // flushed between two synchronous clicks, unlike a ref (immediate).
  const isUpdatingRef = useRef(false)
  const isTransitioningRef = useRef(false)
  const isCreatingMesaRef = useRef(false)

  /**
   * UX-only role gate — sourced from the real, already-authenticated OIDC
   * session (`rol` claim, per `types/userInfo.ts`), never a fabricated or
   * assumed value. Shared across Comanda/Edit/Mesas/Lifecycle — all four
   * apply the identical `capitan`/`admin` condition; this does not and
   * cannot compensate for the pinned backend's confirmed write-path
   * ownership gaps on `PUT /eventos/{id}`, `PATCH /eventos/{id}/estado`,
   * and the mesa routes (see this branch's report).
   */
  const session = useOidcSessionStore((state) => state.session)
  const canManageEvent =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  /**
   * Edit and "add mesa" both additionally require the event to still be in
   * a mutable state — the pinned backend rejects `PUT /eventos/{id}`
   * entirely once `finalizado`/`cancelado` (`SGEB-4013`), and mesa
   * creation the same. Hiding these controls in that state is a genuine
   * UX improvement (there is nothing valid to submit), not a compensating
   * security control.
   */
  const canManageActiveEvent =
    canManageEvent &&
    evento !== null &&
    evento.estado !== 'finalizado' &&
    evento.estado !== 'cancelado'

  /**
   * Resolves the real salón behind `evento.idSalon` — only for a session
   * that could actually reach `GET /salones/{id_salon}` (see
   * `useSalonQuery`'s own comment for the confirmed `capitan`/`admin`-only
   * gap). A `mesero` session, or the event not having loaded yet, both
   * pass `null`, which never sends a request (`skipToken`).
   */
  const salonQuery = useSalonQuery(canManageEvent && evento ? evento.idSalon : null)

  /** A single pre-formatted address line, or `null` if the resolved Salón carries none of its address pieces — see `formatSalonAddress`'s own comment. */
  const salonAddress = salonQuery.data ? formatSalonAddress(salonQuery.data) : null

  /**
   * The evento passed to `EventDetailContent` for DISPLAY only — never
   * reused for any mutation/permission logic above, which all read the
   * real query's `evento` directly. `salonNombre`/`salonLatitud`/
   * `salonLongitud`/`salonAddress` are the fields this overlays:
   * `mapEventoToDetail` deliberately never populates any of them (see that
   * function's own comment), so `EventDetailScheduleSection`'s existing
   * "pendiente de integración" fallback and `EventGeofenceMapPreview`'s own
   * "no pudimos resolver la ubicación" fallback both keep working unchanged
   * whenever `salonQuery` hasn't resolved yet, is disabled for this role,
   * or fails.
   */
  const eventoForDisplay = evento
    ? {
        ...evento,
        ...(salonQuery.data
          ? {
              salonNombre: salonQuery.data.nombre,
              salonLatitud: salonQuery.data.latitud,
              salonLongitud: salonQuery.data.longitud,
            }
          : {}),
        ...(salonAddress ? { salonAddress } : {}),
      }
    : null

  async function handleOpenComanda(signal: AbortSignal, tab: Window | null) {
    await openComandaMutation.mutateAsync({ signal, tab })
  }

  async function handleUploadComanda(file: File) {
    await uploadComandaMutation.mutateAsync(file)
  }

  async function handleRetireComanda() {
    await retireComandaMutation.mutateAsync()
  }

  async function handleUpdateEvento(values: EventEditFormValues) {
    if (idEvento === null || isUpdatingRef.current) {
      return
    }
    isUpdatingRef.current = true
    try {
      const request: UpdateEventoRequest = {
        titulo: values.titulo,
        tipo: values.tipo,
        cupoMeseros: values.cupo_meseros,
        numMesas: values.num_mesas,
        tarifaPorMesero: values.tarifa_por_mesero,
        // Omitted entirely outside `borrador` — see `UpdateEventoRequest`'s
        // own comment for why merely disabling the input is not enough.
        ...(evento?.estado === 'borrador'
          ? { radioGeocercaM: values.radio_geocerca_m }
          : {}),
      }
      await updateEventoMutation.mutateAsync(request)
      setIsEditing(false)
    } finally {
      isUpdatingRef.current = false
    }
  }

  function handleTransition(estado: EventStatus) {
    if (idEvento === null || isTransitioningRef.current) {
      return
    }
    isTransitioningRef.current = true
    changeEstadoMutation.mutate(estado, {
      onSuccess: () => {
        setPageFeedback({ title: EVENT_STATUS_TRANSITION_TOAST_TITLES[estado] })
      },
      onSettled: () => {
        isTransitioningRef.current = false
      },
    })
  }

  async function handleCreateMesa(values: CreateMesaFormValues) {
    if (idEvento === null || isCreatingMesaRef.current) {
      return
    }
    isCreatingMesaRef.current = true
    try {
      await createMesaMutation.mutateAsync({ etiqueta: values.etiqueta })
    } finally {
      isCreatingMesaRef.current = false
    }
  }

  const comandaSectionProps: EventDetailComandaSectionProps = {
    idEvento: idEvento ?? -1,
    comanda: comandaData,
    isLoading: comandaIsLoading,
    canManage: canManageEvent,
    onOpen: handleOpenComanda,
    onUpload: handleUploadComanda,
    onRetire: handleRetireComanda,
    ...(comandaHasRealError
      ? { errorMessage: toSafeErrorMessage(comandaQuery.error) }
      : {}),
  }

  const editBundleProps: EventDetailEditBundleProps = {
    canEdit: canManageActiveEvent,
    isEditing,
    onToggleEdit: () => {
      setIsEditing((previous) => !previous)
    },
    onSubmit: handleUpdateEvento,
    isSubmitting: updateEventoMutation.isPending,
    ...(updateEventoMutation.isError
      ? { errorMessage: toSafeErrorMessage(updateEventoMutation.error) }
      : {}),
  }

  const lifecycleBundleProps: EventDetailLifecycleBundleProps = {
    canManage: canManageEvent,
    ...(!mesasIsLoading && !mesasHasRealError ? { mesasCount: mesasData.length } : {}),
    onTransition: handleTransition,
    isTransitioning: changeEstadoMutation.isPending,
    ...(changeEstadoMutation.isError
      ? { errorMessage: toSafeErrorMessage(changeEstadoMutation.error) }
      : {}),
  }

  const mesasSectionProps: EventDetailMesasSectionProps = {
    mesas: mesasData,
    isLoading: mesasIsLoading,
    ...(evento ? { numMesasPlaneadas: evento.numMesas } : {}),
    canManage: canManageActiveEvent,
    onCreateMesa: handleCreateMesa,
    isCreating: createMesaMutation.isPending,
    ...(mesasHasRealError ? { errorMessage: toSafeErrorMessage(mesasQuery.error) } : {}),
    ...(createMesaMutation.isError
      ? { createErrorMessage: toSafeErrorMessage(createMesaMutation.error) }
      : {}),
  }

  return (
    <div className="flex flex-col gap-6">
      {pageFeedback ? (
        <Toast
          title={pageFeedback.title}
          onDismiss={() => {
            setPageFeedback(null)
          }}
        >
          {pageFeedback.body ? <p>{pageFeedback.body}</p> : null}
        </Toast>
      ) : null}

      <EventDetailContent
        evento={eventoForDisplay}
        isLoading={isLoading}
        {...(hasRealError ? { errorMessage: toSafeErrorMessage(detailQuery.error) } : {})}
        onRetry={() => void detailQuery.refetch()}
        comanda={comandaSectionProps}
        edit={editBundleProps}
        lifecycle={lifecycleBundleProps}
        mesas={mesasSectionProps}
      />
    </div>
  )
}
