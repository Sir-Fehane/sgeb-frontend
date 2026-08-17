import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

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
 * as this foundation already built them (`EventDetailRoadmapSection`).
 * This branch (feature/event-lifecycle-management) adds real editing
 * (`PUT /eventos/{id}`), minimal Mesa management (`GET`/`POST
 * /eventos/{id}/mesas`), and lifecycle actions
 * (`PATCH /eventos/{id}/estado` → publish/start/return-to-draft/cancel —
 * finalization stays owned by Closure, never duplicated here).
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

  const mesasQuery = useMesasQuery(idEvento)
  const mesasData = mesasQuery.data ?? []
  const mesasIsLoading = idEvento !== null && mesasQuery.isPending
  const mesasHasRealError = idEvento !== null && mesasQuery.isError
  const createMesaMutation = useCreateMesaMutation(idEvento ?? -1)

  const updateEventoMutation = useUpdateEventoMutation(idEvento ?? -1)
  const changeEstadoMutation = useChangeEventoEstadoMutation(idEvento ?? -1)

  const [isEditing, setIsEditing] = useState(false)

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
      await createMesaMutation.mutateAsync({
        etiqueta: values.etiqueta,
        ...(values.nfc_uid ? { nfcUid: values.nfc_uid } : {}),
      })
    } finally {
      isCreatingMesaRef.current = false
    }
  }

  const comandaSectionProps: EventDetailComandaSectionProps = {
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
      <EventDetailContent
        evento={evento}
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
