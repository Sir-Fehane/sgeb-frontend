/**
 * UI domain types for the global Cubaitor device fleet — device identity,
 * registration, and health, independent of any specific event. Confirmed
 * against the pinned backend
 * (`sgeb-backend@1fa2e933d72a0619fa7f7b095c5a7a3d1e99969f`,
 * `app/modules/cubaitor/`).
 *
 * Scope split (task §4/§21): a `Cubaitor` row has NO event association at
 * all — the link to an event only exists through `ConfigDispensado.idEvento`
 * (a device is wired to an event's pins, not "assigned" to it as a field on
 * this model). Event-scoped pin configuration, live orders, and dispensing
 * state live in `features/events/cubaitor/`, never here.
 *
 * **`en_linea`/heartbeat — live as of the pinned backend.** `POST
 * /cubaitors/heartbeat` is registered in `start/routes.ts` and wired to
 * `CubaitorService.heartbeat(mac)`, the ESP32 devices' own periodic report —
 * an interim HTTP channel while the MQTT client doesn't exist yet (see that
 * route's own comment: without it, `ultima_conexion` never updated and the
 * dashboard marked every device permanently offline). `enLinea` is
 * server-derived (`segundos_sin_reportar <= 120`), not a raw flag —
 * `useCubaitorEstadoQuery` surfaces it as reported, and
 * `CubaitorFleetSection` renders it as a real online/offline indicator.
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
  /** Last heartbeat timestamp, `null` if the device has never reported — see this file's module comment. */
  ultimaConexion: string | null
}

/** `GET /cubaitors/{id}/estado` — a distinct, derived shape from `Cubaitor` itself, never a subset of it. `enLinea` is server-computed from the heartbeat threshold — see this file's module comment. */
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
