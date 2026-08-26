import type {
  AlertaViewModel,
  AlertasEventoViewModel,
  ConfigDispensadoViewModel,
  CreateConfigDispensadoInput,
  DispensadoViewModel,
  DispensarResultViewModel,
  OrdenDetalleEstado,
  OrdenDetalleViewModel,
  OrdenEstado,
  OrdenViewModel,
  UpdateConfigDispensadoInput,
} from '@/features/events/cubaitor/types/eventCubaitor'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * CONFIRMED WIRE-CASING AND SHAPE MISMATCHES — direct inspection of the
 * pinned backend (`app/modules/ordenes/`, `app/modules/cubaitor/`), not
 * `docs/api/openapi-sgeb.yaml` alone:
 *
 * 1. Every mutating request body in `app/modules/ordenes/validators/orden_validator.ts`
 *    (`reporteValidator`) and `app/modules/cubaitor/validators/cubaitor_validator.ts`
 *    (`configPinValidator`, `configParcialValidator`, `recargaValidator`) is
 *    **snake_case** (`id_cubaitor`, `pin_gpio`, `caudal_ml_seg`,
 *    `volumen_cargado_ml`, `segundos_real`, `reanudar_ordenes`) — matching
 *    OpenAPI. A previous version of this comment claimed the opposite
 *    (camelCase, "confirmed" against an older backend commit); that was
 *    wrong and produced real `SGEB-2001`/"field must be defined" failures
 *    on every pin-config create/update/recharge and manual dispensado
 *    report — fixed at the API boundary in each function below, verified
 *    directly against the validator source at the currently pinned
 *    backend commit. GET query params (`estado`, `id_mesa`) were already
 *    and remain snake_case (unaffected — this is a request-BODY-only fix).
 * 2. `PUT .../config-dispensado/{id}`'s `configParcialValidator` also
 *    accepts optional `id_insumo`/`volumen_cargado_ml` on the currently
 *    pinned backend (its own comment: "Ahora también acepta id_insumo y
 *    volumen_cargado_ml silenciosamente") — this frontend deliberately
 *    still only exposes `caudalMlSeg`/`pinGpio` here (recalibration-only
 *    UX, `UpdateConfigDispensadoInput`); that is a scope choice, not a
 *    wire-casing bug, and not changed by this fix.
 * 3. `POST /orden-detalles/{id}/dispensar` returns `data: Dispensado[]` —
 *    see `types/eventCubaitor.ts`'s `DispensarResultViewModel` comment for
 *    why this is no longer the bespoke wrapper an earlier backend commit
 *    used to return.
 * 4. `PATCH /dispensados/{id}/reporte` request body is `{ segundos_real }`
 *    ONLY — `estado` is always server-computed; OpenAPI's documented
 *    required `estado` field is silently ignored if sent.
 * 5. `GET /eventos/{id}/alertas` has an entirely different response shape
 *    than OpenAPI's `AlertaOperativa` — see `types/eventCubaitor.ts`'s
 *    `AlertaViewModel` comment. It is ALSO a bare array (`data:
 *    AlertaOperativa[]`), not the `{alertas, total, ordenes_pausadas,
 *    severidad_maxima}` wrapper an earlier backend commit returned — see
 *    `AlertasEventoViewModel`'s comment.
 * 6. `PATCH .../config-dispensado/{id}/recarga` returns the **bare**
 *    `ConfigDispensado` resource (`cubaitor_controller.ts`'s
 *    `recargar`: `responder.ok(ctx, r.config, ...)` — the "Punto 5"
 *    comment there says this explicitly). `detalles_reanudados` is NOT
 *    in the JSON body; it only appears inside the human-readable
 *    `technical_message` string, which is not a stable machine field.
 *    A previous version of this file assumed a nested
 *    `{ config, detalles_reanudados }` wrapper here — that was wrong and
 *    caused `recargarConfigDispensado` to dereference `undefined.config`
 *    and throw, even though the backend recharge succeeded (see this
 *    branch's final report for the full write-up). `PATCH
 *    /insumos/{id}/estado` has the identical bare-resource shape — see
 *    `features/menu/services/menuApi.ts`'s module comment.
 *
 * See this branch's final report for the full backend-gap writeup.
 */

interface OrdenDetalleApiRecord {
  id_detalle: number
  id_orden: number
  id_bebida: number
  id_envase: number
  cantidad: number
  volumen_total_ml: number
  estado: OrdenDetalleEstado
  /** Since v1.16 (OpenAPI `OrdenDetalle.dispensados`) — nested so the board can be rehydrated from one request after a reload. */
  dispensados: DispensadoApiRecord[]
}

interface OrdenApiRecord {
  id_orden: number
  id_mesa: number
  id_participacion: number
  estado: OrdenEstado
  creada_en: string
  entregada_en: string | null
  detalles: OrdenDetalleApiRecord[]
}

interface ConfigDispensadoApiRecord {
  id_config: number
  id_evento: number
  id_cubaitor: number
  id_insumo: number
  pin_gpio: number
  caudal_ml_seg: number
  volumen_cargado_ml: number
  volumen_disponible_ml: number
  ultima_calibracion: string | null
  activo: boolean
}

interface DispensadoApiRecord {
  id_dispensado: number
  id_detalle: number
  id_config: number
  volumen_solicitado_ml: number
  segundos_calculado: number
  segundos_real: number | null
  volumen_real_estimado_ml: number | null
  estado: DispensadoViewModel['estado']
  timestamp: string
}

type AlertaApiRecord =
  | {
      tipo: 'botella_vacia'
      codigo: 'SGEB-4009'
      severidad: 'alta'
      id_config: number
      pin_gpio: number
      id_insumo: number
      insumo: string | undefined
      volumen_disponible_ml: number
    }
  | {
      tipo: 'botella_baja'
      codigo: 'SGEB-0003'
      severidad: 'media'
      id_config: number
      pin_gpio: number
      id_insumo: number
      insumo: string | undefined
      volumen_disponible_ml: number
      porcentaje: number
    }
  | {
      tipo: 'cubaitor_sin_conexion'
      codigo: 'SGEB-5003'
      severidad: 'alta'
      id_cubaitor: number
      nombre: string
      segundos_sin_reportar: number | null
      nota: string
    }

function mapOrdenDetalle(record: OrdenDetalleApiRecord): OrdenDetalleViewModel {
  return {
    idDetalle: record.id_detalle,
    idOrden: record.id_orden,
    idBebida: record.id_bebida,
    idEnvase: record.id_envase,
    cantidad: record.cantidad,
    volumenTotalMl: record.volumen_total_ml,
    estado: record.estado,
    dispensados: record.dispensados.map(mapDispensado),
  }
}

function mapOrden(record: OrdenApiRecord): OrdenViewModel {
  return {
    idOrden: record.id_orden,
    idMesa: record.id_mesa,
    idParticipacion: record.id_participacion,
    estado: record.estado,
    creadaEn: record.creada_en,
    entregadaEn: record.entregada_en,
    detalles: record.detalles.map(mapOrdenDetalle),
  }
}

function mapConfigDispensado(
  record: ConfigDispensadoApiRecord,
): ConfigDispensadoViewModel {
  return {
    idConfig: record.id_config,
    idEvento: record.id_evento,
    idCubaitor: record.id_cubaitor,
    idInsumo: record.id_insumo,
    pinGpio: record.pin_gpio,
    caudalMlSeg: record.caudal_ml_seg,
    volumenCargadoMl: record.volumen_cargado_ml,
    volumenDisponibleMl: record.volumen_disponible_ml,
    ultimaCalibracion: record.ultima_calibracion,
    activo: record.activo,
  }
}

function mapDispensado(record: DispensadoApiRecord): DispensadoViewModel {
  return {
    idDispensado: record.id_dispensado,
    idDetalle: record.id_detalle,
    idConfig: record.id_config,
    volumenSolicitadoMl: record.volumen_solicitado_ml,
    segundosCalculado: record.segundos_calculado,
    segundosReal: record.segundos_real,
    volumenRealEstimadoMl: record.volumen_real_estimado_ml,
    estado: record.estado,
    timestamp: record.timestamp,
  }
}

function mapAlerta(record: AlertaApiRecord): AlertaViewModel {
  switch (record.tipo) {
    case 'botella_vacia':
      return {
        tipo: 'botella_vacia',
        codigo: record.codigo,
        severidad: record.severidad,
        idConfig: record.id_config,
        pinGpio: record.pin_gpio,
        idInsumo: record.id_insumo,
        insumo: record.insumo,
        volumenDisponibleMl: record.volumen_disponible_ml,
      }
    case 'botella_baja':
      return {
        tipo: 'botella_baja',
        codigo: record.codigo,
        severidad: record.severidad,
        idConfig: record.id_config,
        pinGpio: record.pin_gpio,
        idInsumo: record.id_insumo,
        insumo: record.insumo,
        volumenDisponibleMl: record.volumen_disponible_ml,
        porcentaje: record.porcentaje,
      }
    case 'cubaitor_sin_conexion':
      return {
        tipo: 'cubaitor_sin_conexion',
        codigo: record.codigo,
        severidad: record.severidad,
        idCubaitor: record.id_cubaitor,
        nombre: record.nombre,
        segundosSinReportar: record.segundos_sin_reportar,
        nota: record.nota,
      }
  }
}

// ─────────────────────────────────────────────────────────────── órdenes

/** `GET /eventos/{id}/ordenes` — "tablero de barra." Only `estado`/`id_mesa` filters exist server-side; `page`/`page_size`/`id_participacion` are documented by OpenAPI but never read by the pinned backend's controller — never send them. */
export async function fetchOrdenesEvento(
  idEvento: number,
  filtros: { estado?: OrdenEstado; idMesa?: number } = {},
  signal?: AbortSignal,
): Promise<OrdenViewModel[]> {
  const envelope = await requestSgeb<OrdenApiRecord[]>({
    url: `/eventos/${String(idEvento)}/ordenes`,
    params: {
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.idMesa ? { id_mesa: filtros.idMesa } : {}),
    },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapOrden)
}

export async function fetchOrden(
  idOrden: number,
  signal?: AbortSignal,
): Promise<OrdenViewModel> {
  const envelope = await requestSgeb<OrdenApiRecord>({
    url: `/ordenes/${String(idOrden)}`,
    ...(signal ? { signal } : {}),
  })
  return mapOrden(envelope.data!)
}

/** `PATCH /ordenes/{id}/estado` — restrict the requested `nuevo` value to `ORDEN_TRANSICIONES_PERMITIDAS[orden.estado]` in the caller; the backend enforces the same table server-side (`SGEB-4011`-class rejection otherwise) but the UI should never offer a transition it knows will fail. */
export async function cambiarEstadoOrden(
  idOrden: number,
  estado: OrdenEstado,
): Promise<OrdenViewModel> {
  const envelope = await requestSgeb<OrdenApiRecord>({
    url: `/ordenes/${String(idOrden)}/estado`,
    method: 'PATCH',
    data: { estado },
  })
  return mapOrden(envelope.data!)
}

/** `POST /orden-detalles/{id}/dispensar` — triggers a REAL physical dispense (server computes seconds/ml, publishes the MQTT command). If any ingredient's configured pin lacks enough volume, NOTHING dispenses and the whole order pauses (`SGEB-4008`/`SGEB-4009`) — surfaced to the caller as a `SgebApplicationError`, never silently retried. Response is `data: Dispensado[]` — see `types/eventCubaitor.ts`'s `DispensarResultViewModel` comment. */
export async function dispensarDetalle(
  idDetalle: number,
): Promise<DispensarResultViewModel> {
  const envelope = await requestSgeb<DispensadoApiRecord[]>({
    url: `/orden-detalles/${String(idDetalle)}/dispensar`,
    method: 'POST',
  })
  return (envelope.data ?? []).map(mapDispensado)
}

/**
 * `PATCH /dispensados/{id}/reporte` — the device's own callback endpoint,
 * normally invoked automatically by the backend's MQTT handler when the
 * Cubaitor reports valve-close telemetry. Exposed here ONLY as a manual
 * fallback for when that automatic path fails/times out (task §23's MQTT
 * failure UX) — `segundosReal: null` mirrors the device-timeout case and
 * marks the dispensado `error` server-side (`SGEB-5006`). Request body is
 * `{ segundos_real }` (snake_case, `reporteValidator`) — the frontend
 * domain stays camelCase; only this boundary transforms it.
 */
export async function reportarDispensado(
  idDispensado: number,
  segundosReal: number | null,
): Promise<DispensadoViewModel> {
  const envelope = await requestSgeb<DispensadoApiRecord>({
    url: `/dispensados/${String(idDispensado)}/reporte`,
    method: 'PATCH',
    data: { segundos_real: segundosReal },
  })
  return mapDispensado(envelope.data!)
}

// ──────────────────────────────────────────────────── config-dispensado

export async function fetchConfigDispensado(
  idEvento: number,
  signal?: AbortSignal,
): Promise<ConfigDispensadoViewModel[]> {
  const envelope = await requestSgeb<ConfigDispensadoApiRecord[]>({
    url: `/eventos/${String(idEvento)}/config-dispensado`,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapConfigDispensado)
}

/** `POST /eventos/{id}/config-dispensado` — request body is `{ id_cubaitor, id_insumo, pin_gpio, caudal_ml_seg, volumen_cargado_ml }` (snake_case, `configPinValidator`, all required). */
export async function createConfigDispensado(
  idEvento: number,
  input: CreateConfigDispensadoInput,
): Promise<ConfigDispensadoViewModel> {
  const envelope = await requestSgeb<ConfigDispensadoApiRecord>({
    url: `/eventos/${String(idEvento)}/config-dispensado`,
    method: 'POST',
    data: {
      id_cubaitor: input.idCubaitor,
      id_insumo: input.idInsumo,
      pin_gpio: input.pinGpio,
      caudal_ml_seg: input.caudalMlSeg,
      volumen_cargado_ml: input.volumenCargadoMl,
    },
  })
  return mapConfigDispensado(envelope.data!)
}

/**
 * Recalibration only — see this file's module comment (#2): the frontend
 * deliberately still only exposes `caudalMlSeg`/`pinGpio` here even though
 * the backend's `configParcialValidator` also optionally accepts
 * `id_insumo`/`volumen_cargado_ml`. Request body is `{ caudal_ml_seg?,
 * pin_gpio? }` (snake_case) — a key is included only when the caller
 * actually supplied that field, same convention as `cubaitorApi.ts`'s
 * `updateCubaitor`.
 */
export async function updateConfigDispensado(
  idEvento: number,
  idConfig: number,
  input: UpdateConfigDispensadoInput,
): Promise<ConfigDispensadoViewModel> {
  const envelope = await requestSgeb<ConfigDispensadoApiRecord>({
    url: `/eventos/${String(idEvento)}/config-dispensado/${String(idConfig)}`,
    method: 'PUT',
    data: {
      ...(input.caudalMlSeg === undefined ? {} : { caudal_ml_seg: input.caudalMlSeg }),
      ...(input.pinGpio === undefined ? {} : { pin_gpio: input.pinGpio }),
    },
  })
  return mapConfigDispensado(envelope.data!)
}

export async function deactivateConfigDispensado(
  idEvento: number,
  idConfig: number,
): Promise<void> {
  await requestSgeb<null>({
    url: `/eventos/${String(idEvento)}/config-dispensado/${String(idConfig)}`,
    method: 'DELETE',
  })
}

/**
 * `PATCH .../config-dispensado/{id}/recarga` — the operational counterpart
 * of an empty-bottle pause: replaces the physical bottle, resets both
 * `volumenCargadoMl`/`volumenDisponibleMl`, and (by default) reactivates
 * orders that were `pausada_por_insumo` waiting on this pin. Request body is
 * `{ volumen_cargado_ml, reanudar_ordenes? }` (snake_case, `recargaValidator`).
 *
 * The response `data` is the **bare** `ConfigDispensado` resource — the
 * backend does not return how many orders were reactivated (that count only
 * appears in the non-machine-readable `technical_message`). Callers that
 * need the reactivated-order count should rely on the query invalidation in
 * `useRecargarConfigDispensadoMutation` (which refetches the órdenes domain)
 * or the realtime `orden:cambio` event, not this return value.
 */
export async function recargarConfigDispensado(
  idEvento: number,
  idConfig: number,
  volumenCargadoMl: number,
  reanudarOrdenes = true,
): Promise<ConfigDispensadoViewModel> {
  const envelope = await requestSgeb<ConfigDispensadoApiRecord>({
    url: `/eventos/${String(idEvento)}/config-dispensado/${String(idConfig)}/recarga`,
    method: 'PATCH',
    data: {
      volumen_cargado_ml: volumenCargadoMl,
      reanudar_ordenes: reanudarOrdenes,
    },
  })
  return mapConfigDispensado(envelope.data!)
}

// ─────────────────────────────────────────────────────────────── alertas

/** `GET /eventos/{id}/alertas` — see `types/eventCubaitor.ts`'s `AlertaViewModel`/`AlertasEventoViewModel` comments: derived live, no persisted alert lifecycle to "resolve," and the response is now a bare array (`total`/`severidadMaxima` are derived here, `ordenesPausadas` is gone — never fabricated). */
export async function fetchAlertasEvento(
  idEvento: number,
  signal?: AbortSignal,
): Promise<AlertasEventoViewModel> {
  const envelope = await requestSgeb<AlertaApiRecord[]>({
    url: `/eventos/${String(idEvento)}/alertas`,
    ...(signal ? { signal } : {}),
  })
  const alertas = (envelope.data ?? []).map(mapAlerta)
  return {
    alertas,
    total: alertas.length,
    severidadMaxima: alertas.some((a) => a.severidad === 'alta')
      ? 'alta'
      : alertas.length > 0
        ? 'media'
        : null,
  }
}
