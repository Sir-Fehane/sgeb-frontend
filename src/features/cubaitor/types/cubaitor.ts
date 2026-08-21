/**
 * UI domain types for the global Cubaitor device fleet — device identity,
 * registration, and health, independent of any specific event. Confirmed
 * against the pinned backend
 * (`sgeb-backend@2c41367f6d5d87b49fbd6d4682d52ee39203b631`,
 * `app/modules/cubaitor/`).
 *
 * Scope split (task §4/§21): a `Cubaitor` row has NO event association at
 * all — the link to an event only exists through `ConfigDispensado.idEvento`
 * (a device is wired to an event's pins, not "assigned" to it as a field on
 * this model). Event-scoped pin configuration, live orders, and dispensing
 * state live in `features/events/cubaitor/`, never here.
 *
 * **`en_linea`/heartbeat — confirmed DEAD in production, not fixable from
 * the frontend.** `CubaitorService.heartbeat(mac)` (the only writer of
 * `ultima_conexion` besides device registration setting it to `null`) has
 * NO registered route anywhere in `start/routes.ts` on the pinned backend —
 * its controller method and validator exist, but nothing ever calls it
 * outside a single unit test that invokes the service directly, bypassing
 * HTTP. The backend's own functional test
 * (`tests/functional/api_barra.spec.ts`) asserts `en_linea: false`
 * immediately after registering a device and treats that as expected,
 * documented behavior ("no es un error… el evento continúa con dispensado
 * manual"). `useCubaitorEstadoQuery` therefore surfaces `enLinea` as
 * reported, but `CubaitorFleetSection` must never present it as a
 * trustworthy live "Online" indicator — see that component's own comment.
 */

export type CubaitorEstado = 'activo' | 'inactivo' | 'mantenimiento'

export interface CubaitorViewModel {
  idCubaitor: number
  nombre: string
  /** Physical identity, immutable once registered — normalized uppercase server-side. */
  mac: string
  hostIp: string | null
  numPins: number
  estado: CubaitorEstado
  /** Raw heartbeat timestamp, if any — see this file's module comment on why it is effectively always `null` in production today. */
  ultimaConexion: string | null
}

/** `GET /cubaitors/{id}/estado` — a distinct, derived shape from `Cubaitor` itself, never a subset of it. See this file's module comment for why `enLinea` cannot be trusted as live. */
export interface CubaitorEstadoViewModel {
  idCubaitor: number
  nombre: string
  mac: string
  enLinea: boolean
  ultimaConexion: string | null
  segundosSinReportar: number | null
  pinesConfigurados: number
}

export interface CreateCubaitorInput {
  nombre: string
  mac: string
  numPins: number
  hostIp?: string | null
}

export interface UpdateCubaitorInput {
  nombre?: string
  numPins?: number
  hostIp?: string | null
  estado?: CubaitorEstado
}
