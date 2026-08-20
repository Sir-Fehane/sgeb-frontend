import { create } from 'zustand'

import type { Tone } from '@/shared/components/ui/tone'

/**
 * Ephemeral, session-only feed backing the panel's notification bell.
 *
 * This is deliberately NOT a client of `GET /notificaciones` — that
 * endpoint's `Notificacion` rows are scoped to `participacion_evento`
 * (`cronograma_service.ts`'s `listarNotificaciones`/`marcarLeida`), i.e.
 * they belong to the mesero working a floor, not to a capitán/admin
 * console session, which typically has no `participacion_evento` row at
 * all. Calling it here would silently return an empty inbox forever for
 * this panel's actual users — see this branch's final report,
 * "notification persistence model," for the full reasoning. Instead this
 * store is populated directly from the three operationally-relevant
 * Socket.IO events (`alerta:insumo`, `solicitud:cambio`,
 * `cronograma:disparado` — see `SocketProvider`), in memory only: no
 * `persist` middleware, no localStorage — a reload always starts empty,
 * the same "no fake persistence" rule `sessionStore.ts` already follows
 * for the OIDC session (ADR-002) and the same one this task's brief
 * requires when a backend has no real inbox for a given surface.
 */
export type RealtimeNotificationType =
  'alerta:insumo' | 'solicitud:cambio' | 'cronograma:disparado'

export interface RealtimeNotification {
  /** Client-generated (`crypto.randomUUID()`) — these rows have no server id to key on. */
  id: string
  type: RealtimeNotificationType
  idEvento: number
  tone: Tone
  title: string
  body: string
  /** The event payload's own `emitido_en` (server clock) — display only, never used for ordering (see `realtimeEvents.ts`'s `Emitido` comment). */
  emitidoEn: string
  read: boolean
}

/** Caps session memory during a long shift — old entries fall off the end, oldest-first (list is always newest-first). */
const MAX_NOTIFICATIONS = 50

export interface RealtimeNotificationStore {
  notifications: RealtimeNotification[]
  add: (notification: Omit<RealtimeNotification, 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  /** Used on socket disconnect-for-logout (`SocketProvider`'s cleanup) — a new session should never inherit the previous captain's feed. */
  clear: () => void
}

export const useRealtimeNotificationStore = create<RealtimeNotificationStore>((set) => ({
  notifications: [],
  add: (notification) =>
    set((state) => ({
      notifications: [{ ...notification, read: false }, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS,
      ),
    })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    })),
  clear: () => set({ notifications: [] }),
}))

export function countUnread(notifications: readonly RealtimeNotification[]): number {
  return notifications.filter((notification) => !notification.read).length
}
