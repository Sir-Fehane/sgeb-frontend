/**
 * UI domain types for the event-scoped bar/Cubaitor operational surface —
 * live orders, dispensing, per-event pin configuration, and operational
 * alerts. Confirmed against the pinned backend
 * (`sgeb-backend@2c41367f6d5d87b49fbd6d4682d52ee39203b631`,
 * `app/modules/ordenes/` + `app/modules/cubaitor/`'s event-scoped surface),
 * not `docs/api/openapi-sgeb.yaml` alone — see `services/eventCubaitorApi.ts`'s
 * module comment for the full list of confirmed mismatches.
 *
 * Scope (task §4/§21): everything here is EVENT-scoped
 * (`ConfigDispensado.idEvento`, `Orden` reached only through the event's
 * mesas). The global Bebida/Insumo/Envase/Cubaitor catalogs live in
 * `features/menu/` and `features/cubaitor/` — this feature only
 * REFERENCES them (e.g. picking an insumo/Cubaitor when configuring a pin),
 * never re-implements their CRUD.
 *
 * **Order creation is out of scope by design, not an oversight**:
 * `POST /mesas/{id_mesa}/ordenes` is restricted to role `mesero` only
 * (`start/routes.ts`'s route grouping) — a captain/admin token cannot call
 * it. This surface is monitoring + intervention (cancel, mark delivered,
 * trigger/observe dispensing), never order creation — per the task's own
 * §9 instruction not to assume the web console places orders when that is
 * really a waiter-app capability.
 */

/** `Orden.estado` — the confirmed state machine (`orden_service.ts`'s `cambiarEstado`, `permitidas` table). `entregada` is the sole successful terminal state; `servida` never existed. */
export type OrdenEstado =
  | 'pendiente'
  | 'en_preparacion'
  | 'dispensando'
  | 'entregada'
  | 'cancelada'
  | 'pausada_por_insumo'

/** `OrdenDetalle.estado` — a DELIBERATELY DISTINCT enum from `Orden.estado` (confirmed: a detail can be `dispensada` while its parent order is still `en_preparacion`). */
export type OrdenDetalleEstado =
  'pendiente' | 'dispensada' | 'entregada' | 'pausada_por_insumo'

export interface OrdenDetalleViewModel {
  idDetalle: number
  idOrden: number
  idBebida: number
  idEnvase: number
  cantidad: number
  /** Frozen at order creation — changing the envase's catalog volume later never retroactively changes this. */
  volumenTotalMl: number
  estado: OrdenDetalleEstado
}

export interface OrdenViewModel {
  idOrden: number
  idMesa: number
  idParticipacion: number
  estado: OrdenEstado
  creadaEn: string
  entregadaEn: string | null
  detalles: readonly OrdenDetalleViewModel[]
}

/**
 * The confirmed legal transition table (`orden_service.ts`'s `cambiarEstado`,
 * read directly off the pinned backend — not inferred/guessed). UI action
 * availability should derive from this, never invent an additional
 * transition the backend does not accept.
 */
export const ORDEN_TRANSICIONES_PERMITIDAS: Record<OrdenEstado, readonly OrdenEstado[]> =
  {
    pendiente: ['en_preparacion', 'cancelada'],
    en_preparacion: ['dispensando', 'entregada', 'pausada_por_insumo', 'cancelada'],
    dispensando: ['entregada', 'pausada_por_insumo', 'cancelada'],
    pausada_por_insumo: ['en_preparacion', 'cancelada'],
    entregada: [],
    cancelada: [],
  }

export type DispensadoEstado = 'ok' | 'parcial' | 'error' | 'pausado_por_insumo'

export interface DispensadoViewModel {
  idDispensado: number
  idDetalle: number
  idConfig: number
  volumenSolicitadoMl: number
  segundosCalculado: number
  segundosReal: number | null
  volumenRealEstimadoMl: number | null
  estado: DispensadoEstado
  timestamp: string
}

/**
 * The confirmed real response shape of `POST
 * /orden-detalles/{id}/dispensar` — NOT a `Dispensado` (OpenAPI documents
 * it as one; the pinned backend's `OrdenService.procesarDetalle` returns a
 * different, mixed-casing shape entirely: the physical instructions sent to
 * the Cubaitor over MQTT, one entry per recipe ingredient/pin). A detail
 * with a 2-ingredient recipe (e.g. alcohol + mixer) produces TWO entries in
 * `instrucciones`, confirmed by the backend's own functional test.
 */
export interface DispensarResultViewModel {
  idDetalle: number
  idEvento: number
  idOrden: number
  idMesa: number
  estadoOrden: OrdenEstado
  instrucciones: readonly {
    idDispensado: number
    pinGpio: number
    volumenMl: number
    segundos: number
  }[]
}

export interface ConfigDispensadoViewModel {
  idConfig: number
  idEvento: number
  idCubaitor: number
  idInsumo: number
  pinGpio: number
  /** ml/second, from calibration — changes as the hose/bottle level changes. */
  caudalMlSeg: number
  volumenCargadoMl: number
  /** Empty-bottle threshold: if a requested pour would exceed this, the order pauses BEFORE the valve opens (`SGEB-4009`) — never a partial pour. */
  volumenDisponibleMl: number
  ultimaCalibracion: string | null
  activo: boolean
}

export interface CreateConfigDispensadoInput {
  idCubaitor: number
  idInsumo: number
  pinGpio: number
  caudalMlSeg: number
  volumenCargadoMl: number
}

/** Confirmed real support surface for `PUT .../config-dispensado/{id}` — recalibration ONLY. `idInsumo`/`volumenCargadoMl` are documented by OpenAPI as editable here but the pinned backend's validator does not accept them; changing the insumo means removing and re-adding the pin, and reloading volume is `recargar` (below), which also reactivates paused orders. */
export interface UpdateConfigDispensadoInput {
  caudalMlSeg?: number
  pinGpio?: number
}

export interface RecargarConfigDispensadoResult {
  config: ConfigDispensadoViewModel
  /** How many previously `pausada_por_insumo` order details this recharge reactivated. */
  detallesReanudados: number
}

export type AlertaTipo = 'botella_vacia' | 'botella_baja' | 'cubaitor_sin_conexion'

/**
 * The confirmed real response shape of `GET /eventos/{id}/alertas` — there
 * is NO alerts table on the pinned backend (`CubaitorService.alertas`'s own
 * comment: "a stale alert is worse than none"); every alert is derived live
 * from current `ConfigDispensado`/`Cubaitor` state on each request. This is
 * SUBSTANTIALLY different from `docs/api/openapi-sgeb.yaml`'s
 * `AlertaOperativa` schema (which claims a persisted `id_alerta`/`estado`
 * lifecycle with `abierta`/`atendida` — none of that exists here). Do not
 * add an "atender/resolver alerta" action anywhere: there is nothing to
 * mark resolved, the alert simply stops appearing once the underlying
 * condition (e.g. a recharge) is fixed.
 */
export type AlertaViewModel =
  | {
      tipo: 'botella_vacia'
      codigo: 'SGEB-4009'
      severidad: 'alta'
      idConfig: number
      pinGpio: number
      idInsumo: number
      insumo: string | undefined
      volumenDisponibleMl: number
    }
  | {
      tipo: 'botella_baja'
      codigo: 'SGEB-0003'
      severidad: 'media'
      idConfig: number
      pinGpio: number
      idInsumo: number
      insumo: string | undefined
      volumenDisponibleMl: number
      porcentaje: number
    }
  | {
      tipo: 'cubaitor_sin_conexion'
      codigo: 'SGEB-5003'
      severidad: 'alta'
      idCubaitor: number
      nombre: string
      segundosSinReportar: number | null
      nota: string
    }

export interface AlertasEventoViewModel {
  alertas: readonly AlertaViewModel[]
  total: number
  ordenesPausadas: number
  severidadMaxima: 'alta' | 'media' | null
}
