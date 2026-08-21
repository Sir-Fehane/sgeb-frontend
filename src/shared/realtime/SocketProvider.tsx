import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { attendanceQueryKeys } from '@/features/events/attendance/queries/attendanceQueryKeys'
import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { eventCubaitorQueryKeys } from '@/features/events/cubaitor/queries/eventCubaitorQueryKeys'
import { eventDashboardQueryKeys } from '@/features/events/dashboard/queries/eventDashboardQueryKeys'
import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { asignacionesQueryKeys } from '@/features/events/queries/asignacionesQueryKeys'
import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { mesasQueryKeys } from '@/features/events/queries/mesasQueryKeys'
import { serviceRequestsQueryKeys } from '@/features/events/service-requests/queries/serviceRequestsQueryKeys'
import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'
import { refreshAccessToken } from '@/features/oidc-client/client/tokenClient'
import { applyRefreshedAccessToken } from '@/features/oidc-client/session/sessionStore'
import { Toast } from '@/shared/components/ui/toast'
import type { Tone } from '@/shared/components/ui/tone'
import { useRealtimeNotificationStore } from '@/shared/realtime/notificationStore'
import { SocketContext, type SocketContextValue } from '@/shared/realtime/socketContext'
import type {
  AlertaInsumo,
  ChecklistCambio,
  CronogramaDisparado,
  CupoActualizado,
  DispensadoCambio,
  MesaCambio,
  OrdenCambio,
  ParticipacionCambio,
  SolicitudCambio,
} from '@/shared/realtime/realtimeEvents'
import { socket } from '@/shared/realtime/socketClient'

function toneForNotification(
  type: 'alerta:insumo' | 'solicitud:cambio' | 'cronograma:disparado',
): Tone {
  if (type === 'alerta:insumo') return 'danger'
  if (type === 'cronograma:disparado') return 'warning'
  return 'info'
}

function motivoCopy(motivo: AlertaInsumo['motivo']): string {
  switch (motivo) {
    case 'botella_vacia':
      return 'botella vacía'
    case 'insumo_agotado':
      return 'insumo agotado'
    case 'sin_configuracion':
      return 'sin configuración de dispensado'
  }
}

interface ToastQueueItem {
  id: string
  tone: Tone
  title: string
  body: string
}

export interface SocketProviderProps {
  children: ReactNode
}

/**
 * Owns the single Socket.IO client lifecycle for the whole authenticated
 * private panel. Mounted exactly once, inside `AppShellLayout`'s
 * `status === 'authenticated'` boundary (see that file) — so this
 * component's own mount/unmount IS the connect/disconnect boundary; it
 * never re-reads session status itself, and never mounts for `/login`,
 * `/auth/callback`, or the public diner routes (none of which are children
 * of `AppShellLayout`).
 *
 * Three responsibilities, deliberately kept together because the backend's
 * own design keeps them together too (`tiempo_real_service.ts`'s own
 * comment: "this is the only place that knows both the domain and the
 * transport"):
 *  1. Connection lifecycle (connect/disconnect/reconnect/auth-retry).
 *  2. Registering all 9 backend-confirmed domain events exactly once,
 *     mapping each to either a narrow TanStack Query invalidation, an
 *     ephemeral notification, or both. `orden:cambio`/`dispensado:cambio`
 *     joined the other 7 on feature/operations-and-reports-live once the
 *     event dashboard's `barra` section gave them something real to
 *     invalidate — see those two handlers' own comment for why they still
 *     target only that one aggregate query, not a dedicated Orders query.
 *  3. Exposing `joinEventRoom`/`leaveEventRoom` so individual event-scoped
 *     pages can opt into the `evento:{id}` room for their own event,
 *     without each page touching `socket` directly.
 *
 * Room scope note (see this branch's final report for the full writeup):
 * the backend has no "join every event I direct" room — only
 * `evento:{id}`, joined one at a time and only while a page actually needs
 * it. So the notification feed this provider populates
 * (`notificationStore.ts`) is honestly scoped to "events open in this tab
 * this session," never a persistent or cross-event inbox — `NotificationBell`
 * states this explicitly rather than implying otherwise.
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const queryClient = useQueryClient()
  const addNotification = useRealtimeNotificationStore((state) => state.add)
  const clearNotifications = useRealtimeNotificationStore((state) => state.clear)

  const [connected, setConnected] = useState(socket.connected)
  const [reconnecting, setReconnecting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [toastQueue, setToastQueue] = useState<ToastQueueItem[]>([])

  /** `idEvento -> number of callers currently wanting that room joined.` Never rebuilt on render — mutated imperatively so `joinEventRoom`/`leaveEventRoom` stay stable across rerenders. */
  const roomRefCounts = useRef(new Map<number, number>())
  /** Guards against hammering `refreshAccessToken()` on every retry within one disconnected episode — at most one proactive refresh attempt per episode, reset on the next successful connect. */
  const hasAttemptedAuthRefresh = useRef(false)

  const pushNotification = useCallback(
    (params: {
      type: 'alerta:insumo' | 'solicitud:cambio' | 'cronograma:disparado'
      idEvento: number
      title: string
      body: string
      emitidoEn: string
    }) => {
      const tone = toneForNotification(params.type)
      addNotification({
        id: crypto.randomUUID(),
        type: params.type,
        idEvento: params.idEvento,
        tone,
        title: params.title,
        body: params.body,
        emitidoEn: params.emitidoEn,
      })
      setToastQueue((queue) => [
        ...queue,
        { id: crypto.randomUUID(), tone, title: params.title, body: params.body },
      ])
    },
    [addNotification],
  )

  const dismissFrontToast = useCallback(() => {
    setToastQueue((queue) => queue.slice(1))
  }, [])

  const joinEventRoom = useCallback((idEvento: number) => {
    const counts = roomRefCounts.current
    const current = counts.get(idEvento) ?? 0
    counts.set(idEvento, current + 1)
    if (current === 0) {
      socket.emit('unirse:evento', idEvento, () => {
        // Ack failure (e.g. SGEB-1004, not a room this session may join) is
        // not surfaced as a page-level error: the page's own REST query
        // already governs whether the user can see this event at all, and
        // failing to join a live-update room degrades to "no push updates,
        // REST polling/manual refetch still works" — never a hard failure.
      })
    }
  }, [])

  const leaveEventRoom = useCallback((idEvento: number) => {
    const counts = roomRefCounts.current
    const current = counts.get(idEvento) ?? 0
    if (current <= 1) {
      counts.delete(idEvento)
      socket.emit('salir:evento', idEvento)
    } else {
      counts.set(idEvento, current - 1)
    }
  }, [])

  // ── Connection lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    const roomCounts = roomRefCounts.current
    socket.connect()
    return () => {
      socket.disconnect()
      roomCounts.clear()
      clearNotifications()
    }
  }, [clearNotifications])

  useEffect(() => {
    function handleConnect() {
      setConnected(true)
      setReconnecting(false)
      setLastError(null)
      hasAttemptedAuthRefresh.current = false
      // Rooms are per-connection server-side (no session resumption on the
      // backend) — every successful (re)connect must rejoin whatever this
      // tab currently wants joined, or a reconnect after a network blip
      // would silently stop delivering updates for an open event page.
      for (const idEvento of roomRefCounts.current.keys()) {
        socket.emit('unirse:evento', idEvento, () => {
          // Same "degrade to REST-only, never a hard failure" reasoning as
          // `joinEventRoom`'s own ack callback above.
        })
      }
    }

    function handleDisconnect() {
      setConnected(false)
    }

    function handleReconnectAttempt() {
      setReconnecting(true)
    }

    function handleConnectError(error: Error) {
      setConnected(false)
      setLastError(error.message)

      // `SGEB-1003` = handshake rejected (missing/invalid/expired token).
      // At most one proactive refresh per disconnected episode — reusing
      // the exact same refresh primitive `sgebClient.ts` uses on a REST
      // 401, never a second auth mechanism. If the refresh itself fails
      // (no valid cookie — e.g. a genuinely logged-out session), this does
      // NOT retry again or force navigation: socket.io's own bounded
      // exponential-backoff reconnection loop keeps retrying with whatever
      // token `auth()` resolves at each attempt, which is the documented,
      // backend-confirmed strategy (RESPUESTAS-frontend-FINAL.md §2:
      // "reconnect-on-refresh es la decisión correcta").
      if (error.message === 'SGEB-1003' && !hasAttemptedAuthRefresh.current) {
        hasAttemptedAuthRefresh.current = true
        void refreshAccessToken().then((result) => {
          if (result.outcome !== 'success') {
            return
          }
          const applied = applyRefreshedAccessToken({
            accessToken: result.token.access_token,
            accessTokenExpiresAt: Date.now() + result.token.expires_in * 1000,
            ...(result.token.id_token ? { idToken: result.token.id_token } : {}),
            ...(result.token.scope ? { scope: result.token.scope } : {}),
          })
          if (applied) {
            socket.connect()
          }
        })
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
    }
  }, [])

  // ── Domain events: query invalidation + ephemeral notifications ────────
  useEffect(() => {
    function onCupoActualizado(payload: CupoActualizado) {
      // REST resync target per RESPUESTAS-frontend-FINAL.md §2: `GET /eventos/{id}`.
      void queryClient.invalidateQueries({
        queryKey: eventsQueryKeys.detail(payload.idEvento),
      })
      // `apartar`/liberar un lugar (the action behind this event) changes
      // the roster Team Selection reads, without its own `participacion:cambio`
      // (confirmed against the backend test suite: `apartar` emits only
      // `cupo:actualizado`) — so this is the only signal that resyncs it.
      void queryClient.invalidateQueries({
        queryKey: teamSelectionQueryKeys.list(payload.idEvento),
      })
      // `resumen.disponibles`/`asistencia` on the event dashboard read the
      // same underlying counts.
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })
    }

    function onParticipacionCambio(payload: ParticipacionCambio) {
      void queryClient.invalidateQueries({
        queryKey: teamSelectionQueryKeys.list(payload.idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.list(payload.idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.participants(payload.idEvento),
      })
      // Closure readiness (`participaciones_sin_salida`/`listo`) is computed
      // live from `Participacion.estado` on every read, no cached
      // aggregate — same reasoning `useMarkParticipantSalidaMutation.ts`
      // already documents for its own invalidation of this same key.
      void queryClient.invalidateQueries({
        queryKey: closureQueryKeys.readiness(payload.idEvento),
      })
      // The event dashboard's `resumen`/`asistencia`/`montaje` sections all
      // aggregate `Participacion` state.
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })
    }

    function onMesaCambio(payload: MesaCambio) {
      void queryClient.invalidateQueries({
        queryKey: mesasQueryKeys.list(payload.idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: asignacionesQueryKeys.list(payload.idEvento),
      })
      // The event dashboard's `piso` section aggregates `Mesa`/`AsignacionMesa` state.
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })
    }

    function onChecklistCambio(payload: ChecklistCambio) {
      // REST resync target: `GET /participaciones/{id}/checklist-instancias`.
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.checklistInstancias(payload.idParticipacion),
      })
      // `aprobado: true` is also the only signal that `Participacion.checklist_ok`
      // flipped (`checklist_service.ts`'s `aprobar` — confirmed it does NOT
      // also emit `participacion:cambio`), so the roster (which surfaces
      // `checklistOk`) needs the same invalidation.
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.participants(payload.idEvento),
      })
      // The event dashboard's `montaje` section aggregates checklist completion.
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })
    }

    /**
     * `orden:cambio`/`dispensado:cambio` — as of `feature/panel-realtime-
     * notifications` these only invalidated the event dashboard's `barra`
     * section, since no dedicated Orders/Cubaitor feature existed yet. Now
     * that `feature/cubaitor-orders-live` ships the real "tablero de
     * barra" (`features/events/cubaitor`), extend those same confirmed
     * events to invalidate its query domains too — never a new event name,
     * never a duplicate listener, never a manual cache mutation of the
     * payload (a full refetch is safer than trusting a partial realtime
     * payload to reconstruct `OrdenViewModel`/`ConfigDispensadoViewModel`).
     */
    function onOrdenCambio(payload: OrdenCambio) {
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.ordenes(payload.idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.orden(payload.idOrden),
      })
    }

    function onDispensadoCambio(payload: DispensadoCambio) {
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.ordenes(payload.idEvento),
      })
      // A dispensado report can also cross the empty-bottle threshold (the
      // config's `volumen_disponible_ml` just changed), so the Configuración
      // tab's pin list should refetch too, not only the order board.
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.config(payload.idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.alertas(payload.idEvento),
      })
    }

    function onAlertaInsumo(payload: AlertaInsumo) {
      // "La alerta que más importa del canal" per the backend's own comment.
      pushNotification({
        type: 'alerta:insumo',
        idEvento: payload.idEvento,
        title: `Insumo: ${payload.nombreInsumo}`,
        body: `${motivoCopy(payload.motivo)} — ${String(payload.ordenesPausadas)} orden(es) en pausa.`,
        emitidoEn: payload.emitido_en,
      })
      // The event dashboard's `alertas` section reads the same Cubaitor alert logic.
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })
      // The bar screen's own inline alerts banner (`GET /eventos/{id}/alertas`,
      // task §13) is a durable, always-current READ of the same live-derived
      // state this event reports a change to — refetch it too, distinct from
      // (and in addition to) the ephemeral toast above.
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.alertas(payload.idEvento),
      })
    }

    function onSolicitudCambio(payload: SolicitudCambio) {
      // Every transition (not just a new `pendiente` one) invalidates the
      // real data now that this branch has a Solicitudes screen
      // (`features/events/service-requests`) and the dashboard's
      // `servicio.solicitudes_pendientes` count to keep in sync — a
      // captain resolving a request on their own screen still needs that
      // list/count to drop the row.
      void queryClient.invalidateQueries({ queryKey: serviceRequestsQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(payload.idEvento),
      })

      // Only a NEW request is worth a proactive nudge — `atendida`/`cancelada`
      // transitions are typically the captain's own action on a screen that
      // already reflects them; surfacing those too would be noise with
      // nothing new to act on.
      if (payload.estado !== 'pendiente') {
        return
      }
      pushNotification({
        type: 'solicitud:cambio',
        idEvento: payload.idEvento,
        title: 'Nueva solicitud de mesa',
        body: `Mesa ${String(payload.idMesa)}: ${payload.tipo}`,
        emitidoEn: payload.emitido_en,
      })
    }

    function onCronogramaDisparado(payload: CronogramaDisparado) {
      pushNotification({
        type: 'cronograma:disparado',
        idEvento: payload.idEvento,
        title: 'Hito de cronograma',
        body: payload.mensaje,
        emitidoEn: payload.emitido_en,
      })
    }

    socket.on('cupo:actualizado', onCupoActualizado)
    socket.on('participacion:cambio', onParticipacionCambio)
    socket.on('mesa:cambio', onMesaCambio)
    socket.on('checklist:cambio', onChecklistCambio)
    socket.on('orden:cambio', onOrdenCambio)
    socket.on('dispensado:cambio', onDispensadoCambio)
    socket.on('alerta:insumo', onAlertaInsumo)
    socket.on('solicitud:cambio', onSolicitudCambio)
    socket.on('cronograma:disparado', onCronogramaDisparado)

    return () => {
      socket.off('cupo:actualizado', onCupoActualizado)
      socket.off('participacion:cambio', onParticipacionCambio)
      socket.off('mesa:cambio', onMesaCambio)
      socket.off('checklist:cambio', onChecklistCambio)
      socket.off('orden:cambio', onOrdenCambio)
      socket.off('dispensado:cambio', onDispensadoCambio)
      socket.off('alerta:insumo', onAlertaInsumo)
      socket.off('solicitud:cambio', onSolicitudCambio)
      socket.off('cronograma:disparado', onCronogramaDisparado)
    }
  }, [queryClient, pushNotification])

  const contextValue = useMemo<SocketContextValue>(
    () => ({ connected, reconnecting, lastError, joinEventRoom, leaveEventRoom }),
    [connected, reconnecting, lastError, joinEventRoom, leaveEventRoom],
  )

  const frontToast = toastQueue[0] ?? null

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
      {frontToast ? (
        <RealtimeToast
          key={frontToast.id}
          tone={frontToast.tone}
          title={frontToast.title}
          body={frontToast.body}
          onDismiss={dismissFrontToast}
        />
      ) : null}
    </SocketContext.Provider>
  )
}

/**
 * Thin wrapper around the shared `Toast` (`shared/components/ui/toast.tsx`)
 * so `SocketProvider` can render its own small FIFO queue on top of it —
 * `Toast` itself explicitly stays single-instance/no-queue (its own doc
 * comment); this is the "caller builds a small queue on top" case that
 * comment anticipates, kept local to this provider rather than changing
 * `Toast`'s contract for every other caller.
 */
function RealtimeToast({
  tone,
  title,
  body,
  onDismiss,
}: {
  tone: Tone
  title: string
  body: string
  onDismiss: () => void
}) {
  return (
    <Toast tone={tone} title={title} onDismiss={onDismiss}>
      <p>{body}</p>
    </Toast>
  )
}
