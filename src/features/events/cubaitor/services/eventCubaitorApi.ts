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
  RecargarConfigDispensadoResult,
  UpdateConfigDispensadoInput,
} from '@/features/events/cubaitor/types/eventCubaitor'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * CONFIRMED WIRE-CASING AND SHAPE MISMATCHES — direct inspection of the
 * pinned backend (`app/modules/ordenes/`, `app/modules/cubaitor/`), not
 * `docs/api/openapi-sgeb.yaml` alone:
 *
 * 1. Every mutating request body in `app/modules/ordenes/validators/orden_validator.ts`
 *    and `app/modules/cubaitor/validators/cubaitor_validator.ts` uses
 *    **camelCase** (`idCubaitor`, `pinGpio`, `caudalMlSeg`,
 *    `volumenCargadoMl`, `segundosReal`, `reanudarOrdenes`) — OpenAPI
 *    documents snake_case throughout. GET query params (`estado`, `id_mesa`)
 *    stay snake_case (unaffected — this is a request-BODY-only quirk).
 * 2. `PUT .../config-dispensado/{id}` only accepts `caudalMlSeg`/`pinGpio`
 *    server-side (`configParcialValidator`) — NOT `idInsumo`/
 *    `volumenCargadoMl`, despite OpenAPI documenting both as editable here.
 * 3. `POST /orden-detalles/{id}/dispensar` does NOT return a `Dispensado` —
 *    see `types/eventCubaitor.ts`'s `DispensarResultViewModel` comment for
 *    the confirmed real (mixed-casing) shape.
 * 4. `PATCH /dispensados/{id}/reporte` request body is `{ segundosReal }`
 *    ONLY — `estado` is always server-computed; OpenAPI's documented
 *    required `estado` field is silently ignored if sent.
 * 5. `GET /eventos/{id}/alertas` has an entirely different response shape
 *    than OpenAPI's `AlertaOperativa` — see `types/eventCubaitor.ts`'s
 *    `AlertaViewModel` comment.
 * 6. `PATCH .../config-dispensado/{id}/recarga` and `PATCH
 *    /insumos/{id}/estado` both return a nested wrapper object
 *    (`{ config, detalles_reanudados }` / `{ insumo, ordenes_pausadas }`),
 *    never a bare resource — mapped explicitly below.
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

interface DispensarInstruccionApiRecord {
  id_dispensado: number
  pin_gpio: number
  volumen_ml: number
  segundos: number
}

/** The real `dispensar` response — see this file's module comment (#3). */
interface DispensarResultApiRecord {
  id_detalle: number
  idEvento: number
  idOrden: number
  idMesa: number
  estadoOrden: OrdenEstado
  instrucciones: DispensarInstruccionApiRecord[]
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

interface AlertasApiRecord {
  alertas: AlertaApiRecord[]
  total: number
  ordenes_pausadas: number
  severidad_maxima: 'alta' | 'media' | null
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

/** `POST /orden-detalles/{id}/dispensar` — triggers a REAL physical dispense (server computes seconds/ml, publishes the MQTT command). If any ingredient's configured pin lacks enough volume, NOTHING dispenses and the whole order pauses (`SGEB-4008`/`SGEB-4009`) — surfaced to the caller as a `SgebApplicationError`, never silently retried. See `types/eventCubaitor.ts`'s `DispensarResultViewModel` for why this response is not a `Dispensado`. */
export async function dispensarDetalle(
  idDetalle: number,
): Promise<DispensarResultViewModel> {
  const envelope = await requestSgeb<DispensarResultApiRecord>({
    url: `/orden-detalles/${String(idDetalle)}/dispensar`,
    method: 'POST',
  })
  const record = envelope.data!
  return {
    idDetalle: record.id_detalle,
    idEvento: record.idEvento,
    idOrden: record.idOrden,
    idMesa: record.idMesa,
    estadoOrden: record.estadoOrden,
    instrucciones: record.instrucciones.map((i) => ({
      idDispensado: i.id_dispensado,
      pinGpio: i.pin_gpio,
      volumenMl: i.volumen_ml,
      segundos: i.segundos,
    })),
  }
}

/**
 * `PATCH /dispensados/{id}/reporte` — the device's own callback endpoint,
 * normally invoked automatically by the backend's MQTT handler when the
 * Cubaitor reports valve-close telemetry. Exposed here ONLY as a manual
 * fallback for when that automatic path fails/times out (task §23's MQTT
 * failure UX) — `segundosReal: null` mirrors the device-timeout case and
 * marks the dispensado `error` server-side (`SGEB-5006`).
 */
export async function reportarDispensado(
  idDispensado: number,
  segundosReal: number | null,
): Promise<DispensadoViewModel> {
  const envelope = await requestSgeb<DispensadoApiRecord>({
    url: `/dispensados/${String(idDispensado)}/reporte`,
    method: 'PATCH',
    data: { segundosReal },
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

export async function createConfigDispensado(
  idEvento: number,
  input: CreateConfigDispensadoInput,
): Promise<ConfigDispensadoViewModel> {
  const envelope = await requestSgeb<ConfigDispensadoApiRecord>({
    url: `/eventos/${String(idEvento)}/config-dispensado`,
    method: 'POST',
    data: {
      idCubaitor: input.idCubaitor,
      idInsumo: input.idInsumo,
      pinGpio: input.pinGpio,
      caudalMlSeg: input.caudalMlSeg,
      volumenCargadoMl: input.volumenCargadoMl,
    },
  })
  return mapConfigDispensado(envelope.data!)
}

/** Recalibration only — see this file's module comment (#2): `idInsumo`/`volumenCargadoMl` are not accepted here despite OpenAPI. */
export async function updateConfigDispensado(
  idEvento: number,
  idConfig: number,
  input: UpdateConfigDispensadoInput,
): Promise<ConfigDispensadoViewModel> {
  const envelope = await requestSgeb<ConfigDispensadoApiRecord>({
    url: `/eventos/${String(idEvento)}/config-dispensado/${String(idConfig)}`,
    method: 'PUT',
    data: input,
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

/** `PATCH .../config-dispensado/{id}/recarga` — the operational counterpart of an empty-bottle pause: replaces the physical bottle, resets both `volumenCargadoMl`/`volumenDisponibleMl`, and (by default) reactivates orders that were `pausada_por_insumo` waiting on this pin. */
export async function recargarConfigDispensado(
  idEvento: number,
  idConfig: number,
  volumenCargadoMl: number,
  reanudarOrdenes = true,
): Promise<RecargarConfigDispensadoResult> {
  const envelope = await requestSgeb<{
    config: ConfigDispensadoApiRecord
    detalles_reanudados: number
  }>({
    url: `/eventos/${String(idEvento)}/config-dispensado/${String(idConfig)}/recarga`,
    method: 'PATCH',
    data: { volumenCargadoMl, reanudarOrdenes },
  })
  const data = envelope.data as {
    config: ConfigDispensadoApiRecord
    detalles_reanudados: number
  }
  return {
    config: mapConfigDispensado(data.config),
    detallesReanudados: data.detalles_reanudados,
  }
}

// ─────────────────────────────────────────────────────────────── alertas

/** `GET /eventos/{id}/alertas` — see `types/eventCubaitor.ts`'s `AlertaViewModel` comment: derived live, no persisted alert lifecycle to "resolve." */
export async function fetchAlertasEvento(
  idEvento: number,
  signal?: AbortSignal,
): Promise<AlertasEventoViewModel> {
  const envelope = await requestSgeb<AlertasApiRecord>({
    url: `/eventos/${String(idEvento)}/alertas`,
    ...(signal ? { signal } : {}),
  })
  const data = envelope.data!
  return {
    alertas: data.alertas.map(mapAlerta),
    total: data.total,
    ordenesPausadas: data.ordenes_pausadas,
    severidadMaxima: data.severidad_maxima,
  }
}
