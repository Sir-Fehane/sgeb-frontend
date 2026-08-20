import { io, type Socket } from 'socket.io-client'

import { getOidcAccessToken } from '@/features/oidc-client/session/sessionStore'
import { env } from '@/shared/config/env'
import type {
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
} from '@/shared/realtime/realtimeEvents'

/**
 * The backend mounts Socket.IO on the same HTTP process/origin as the REST
 * API (`tiempo_real_service.ts`: no separate port, `path: '/socket.io'`),
 * so the socket target is derived from `VITE_SGEB_API_URL`'s origin rather
 * than a new env var — `VITE_SGEB_API_URL` itself carries a `/v1` REST path
 * suffix (e.g. `http://sgeb.local.test:3333/v1`) that the socket handshake
 * must NOT include; `io()` connects to an origin, not a path.
 */
const SOCKET_ORIGIN = new URL(env.VITE_SGEB_API_URL).origin

/**
 * Single Socket.IO client instance for the whole app lifecycle — created
 * once at module scope, exactly like `sgebClient` (`shared/api/sgebClient.ts`).
 * `autoConnect: false`: opening/closing the connection is owned entirely by
 * `SocketProvider`, gated on an authenticated session
 * (`AppShellLayout`'s private-route boundary) — importing this module must
 * never itself open a network connection.
 *
 * `auth` is a FUNCTION, not a plain object. socket.io-client invokes it
 * fresh immediately before the initial connection attempt AND before every
 * automatic reconnection attempt, so the handshake always carries whatever
 * token currently lives in the session store — never one captured once at
 * module load. This mirrors `attachSgebAuthInterceptors`'s "resolve fresh,
 * never capture" rule for the REST transport
 * (`shared/api/sgebClient.ts:146-154`), applied to the socket handshake
 * per this branch's brief.
 *
 * `transports: ['websocket']` matches the backend's own functional test
 * client (`tests/functional/tiempo_real.spec.ts:48-58`) — no long-polling
 * fallback is documented or tested on the backend.
 */
export const socket: Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents> =
  io(SOCKET_ORIGIN, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: false,
    auth: (callback) => {
      callback({ token: getOidcAccessToken() ?? '' })
    },
  })
