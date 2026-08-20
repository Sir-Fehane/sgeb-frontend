import { IconAlertTriangle, IconBell, IconInfoCircle } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import {
  countUnread,
  useRealtimeNotificationStore,
  type RealtimeNotification,
} from '@/shared/realtime/notificationStore'
import { formatNotificationTime } from '@/shared/realtime/utils/realtimeFormatting'
import { useSocket } from '@/shared/realtime/useSocket'
import { cn } from '@/shared/utils/cn'

/** Only shown after a disconnect has lasted a few seconds — a network blip that recovers in under this window should never flicker a "reconnecting" hint (§10 of this branch's brief: subtle, not a global banner). */
const RECONNECT_HINT_DELAY_MS = 3000

function useDebouncedReconnecting(reconnecting: boolean): boolean {
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (!reconnecting) {
      // Nothing to reset here: the previous effect run's own cleanup
      // (below) already reset `showHint` to `false` the moment
      // `reconnecting` flipped away from `true` — this branch never needs
      // to call `setShowHint` itself.
      return
    }
    const timer = window.setTimeout(() => {
      setShowHint(true)
    }, RECONNECT_HINT_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      setShowHint(false)
    }
  }, [reconnecting])

  return showHint
}

function NotificationIcon({ type }: { type: RealtimeNotification['type'] }) {
  if (type === 'alerta:insumo') {
    return <IconAlertTriangle aria-hidden="true" className="text-destructive size-4" />
  }
  if (type === 'cronograma:disparado') {
    return <IconAlertTriangle aria-hidden="true" className="text-warning size-4" />
  }
  return <IconInfoCircle aria-hidden="true" className="text-info size-4" />
}

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: RealtimeNotification
  onSelect: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect(notification.id)
        }}
        className={cn(
          'flex w-full items-start gap-2.5 px-4 py-3 text-left',
          'hover:bg-accent focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:-ring-offset-2',
          !notification.read && 'bg-info/5',
        )}
      >
        <span className="mt-0.5 shrink-0">
          <NotificationIcon type={notification.type} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="font-sans text-body-sm text-foreground truncate font-medium">
              {notification.title}
            </span>
            <span className="text-caption text-muted-foreground shrink-0">
              {formatNotificationTime(notification.emitidoEn)}
            </span>
          </span>
          <span className="text-caption text-muted-foreground mt-0.5 block">
            {notification.body}
          </span>
        </span>
        {!notification.read ? (
          <span
            aria-label="Sin leer"
            className="bg-info mt-1.5 size-2 shrink-0 rounded-full"
          />
        ) : null}
      </button>
    </li>
  )
}

/**
 * Replaces `Topbar`'s previously-disabled bell placeholder. Backed by
 * `notificationStore.ts` (ephemeral, session/room-scoped — see that
 * module's own comment for why this is honestly NOT `GET /notificaciones`)
 * and `useSocket()` for a subtle, debounced reconnecting hint.
 *
 * Copy is deliberately terse for an operational panel (captains scan this,
 * they don't read it) but still honest about the two things that matter,
 * matching what `useEventRealtimeRoom` actually does: "Avisos en vivo del
 * evento abierto" states the live scope (a NEW notification only ever
 * arrives while the relevant event's room is joined, i.e. while that
 * event's page is mounted) without ever saying "socket"/"room"/"evento
 * abierto en esta pestaña." The one-line disclaimer below it — kept
 * visually subtle on purpose, never the loudest text in the panel —
 * covers the other true fact: entries already in `notificationStore.ts`
 * are NOT cleared when a page unmounts (only on `SocketProvider` unmount,
 * i.e. logout/session loss), so they can outlive the event they came
 * from, and none of it is a persisted history. Never a global or
 * persistent inbox across every event a captain directs.
 */
export function NotificationBell() {
  const { reconnecting } = useSocket()
  const showReconnectHint = useDebouncedReconnecting(reconnecting)

  const notifications = useRealtimeNotificationStore((state) => state.notifications)
  const markRead = useRealtimeNotificationStore((state) => state.markRead)
  const markAllRead = useRealtimeNotificationStore((state) => state.markAllRead)
  const unread = countUnread(notifications)

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          unread > 0 ? `Notificaciones — ${String(unread)} sin leer` : 'Notificaciones'
        }
        title="Notificaciones"
        onClick={() => {
          setOpen((value) => !value)
        }}
        className={cn(
          'text-muted-foreground relative flex size-10 shrink-0 items-center justify-center rounded-lg',
          'hover:bg-accent hover:text-foreground',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        )}
      >
        <IconBell aria-hidden="true" className="size-5" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="bg-destructive text-destructive-foreground absolute top-1 right-1 flex size-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] leading-none font-semibold"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
        {showReconnectHint ? (
          <span
            aria-hidden="true"
            title="Reconectando el canal en tiempo real…"
            className="bg-warning absolute bottom-1 left-1 size-2 rounded-full"
          />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="bg-card border-border absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border shadow-lg"
        >
          <div className="border-border border-b px-4 py-3">
            <p className="font-sans text-body-sm text-foreground font-semibold">
              Alertas
            </p>
            <p className="text-caption text-muted-foreground mt-0.5">
              Avisos en vivo del evento abierto.
            </p>
            <p className="text-label text-muted-foreground/70 mt-1">
              Los avisos de esta sesión no se guardan como historial.
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <IconBell aria-hidden="true" className="text-muted-foreground/50 size-6" />
              <p className="text-caption text-muted-foreground">Sin avisos por ahora.</p>
            </div>
          ) : (
            <>
              <ul className="max-h-80 divide-y overflow-y-auto">
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onSelect={markRead}
                  />
                ))}
              </ul>
              <div className="border-border border-t px-4 py-2">
                <button
                  type="button"
                  disabled={unread === 0}
                  onClick={markAllRead}
                  className="text-body-sm text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
                >
                  Marcar todas como leídas
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
