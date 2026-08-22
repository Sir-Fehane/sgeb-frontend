import type {
  EventMermaSummaryViewModel,
  EventRatingsSummaryViewModel,
  WaiterPerformanceFilterState,
  WaiterPerformancePageViewModel,
  WaiterPerformanceRowViewModel,
} from '@/features/reports/types/report'
import { isSgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { SGEB_CODE } from '@/shared/api/sgebCodes'
import { requestSgeb } from '@/shared/api/sgebClient'

/** `puntuacion <= 2` — the same "baja" threshold `DashboardService.evento`'s `servicio.calificaciones_bajas` uses (`dashboard_service.ts`), reused here so "bajas" means the same thing on both screens. */
const LOW_RATING_THRESHOLD = 2

interface ReportesMermaListApiRecord {
  reportes: { id_reporte: number }[]
  costo_total: number
  piezas_sin_costear: number
}

/**
 * Fetches merma totals for one event through the shared authenticated
 * SGEB transport. Only the two server-computed aggregates plus a derived
 * count are mapped — the itemized `detalles` per report are Closure's own
 * concern (`EventClosureWasteReportsSection`), not duplicated here; this
 * screen deep-links to `/eventos/{id}/cierre` for that detail instead of
 * re-rendering it.
 */
export async function fetchEventMermaSummary(
  idEvento: number,
  signal?: AbortSignal,
): Promise<EventMermaSummaryViewModel> {
  const envelope = await requestSgeb<ReportesMermaListApiRecord>({
    url: `/eventos/${String(idEvento)}/reportes-merma`,
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — `listarMermas` always
    // returns the object literal — guarded defensively rather than
    // assumed, same convention as `fetchClosureReadiness`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return {
    reportesCount: envelope.data.reportes.length,
    costoTotal: envelope.data.costo_total,
    piezasSinCostear: envelope.data.piezas_sin_costear,
  }
}

interface CalificacionApiRecord {
  id_calificacion: number
  id_mesa: number
  id_participacion: number
  puntuacion: number
  comentario: string | null
  creada_en: string
}

interface CalificacionesListApiRecord {
  calificaciones: CalificacionApiRecord[]
  total: number
  promedio: number | null
}

/**
 * Fetches diner ratings for one event through the shared authenticated
 * SGEB transport — capitán/admin only server-side
 * (`ComensalController.listarCalificaciones`); a `mesero` session calling
 * this receives `SGEB-1004` (see `services/reportsApi.ts`'s caller —
 * `ReportsPage` gates this fetch by role first, same UX-only pattern
 * `EventClosurePage`'s `canFinalizeEvento` already uses, never a
 * substitute for the real server-side check). `soloBajas` sends
 * `puntuacion_max=2`, the backend's own documented filter for surfacing
 * ratings worth acting on — never simulated client-side over a full
 * fetch.
 */
export async function fetchEventRatings(
  idEvento: number,
  soloBajas: boolean,
  signal?: AbortSignal,
): Promise<EventRatingsSummaryViewModel> {
  const envelope = await requestSgeb<CalificacionesListApiRecord>({
    url: `/eventos/${String(idEvento)}/calificaciones`,
    ...(soloBajas ? { params: { puntuacion_max: LOW_RATING_THRESHOLD } } : {}),
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — guarded defensively
    // rather than assumed, same convention as `fetchEventMermaSummary`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return {
    calificaciones: envelope.data.calificaciones.map((record) => ({
      idCalificacion: record.id_calificacion,
      idMesa: record.id_mesa,
      idParticipacion: record.id_participacion,
      puntuacion: record.puntuacion,
      comentario: record.comentario,
      creadaEn: record.creada_en,
    })),
    total: envelope.data.total,
    promedio: envelope.data.promedio,
  }
}

/**
 * One row of `GET /reportes/desempeno-meseros` — confirmed against
 * `ReporteService.desempenoMeseros` (`reporte_service.ts`). `puntualidad`
 * is always `null` on the wire (a discarded metric, not a pending one — see
 * that service's own comment) and is deliberately never read here; see
 * `WaiterPerformanceRowViewModel`'s comment for why it has no view-model
 * field at all.
 */
interface DesempenoMeseroApiRecord {
  uuid_usuario: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  eventos_trabajados: number
  asistencias: number
  faltas: number
  pagos_acumulados: number
  pagos_recibidos: number
  por_cobrar: number
  calificaciones_recibidas: number
  promedio_calificacion: number | null
  calificaciones_bajas: number
  solicitudes_atendidas: number
  segundos_respuesta_promedio: number | null
  puntualidad: null
}

/** `responder.lista(ctx, r.filas, { ...r.meta, periodo: r.periodo })` (`reportes_controller.ts`) — `data` is `{ items, meta }`, never a bare array, despite what `openapi-sgeb.yaml` documents. */
interface DesempenoMeserosListApiRecord {
  items: DesempenoMeseroApiRecord[]
  meta: {
    page: number
    page_size: number
    total: number
    last_page: number
    periodo: { desde: string; hasta: string }
  }
}

/**
 * `GET /reportes/desempeno-meseros` query parameters this call actually
 * sends — confirmed against `desempenoValidator`
 * (`reportes_controller.ts`): the real backend expects **camelCase**
 * (`fechaDesde`, `fechaHasta`, `uuidMesero`, `pageSize`), unlike what
 * `openapi-sgeb.yaml` documents (`fecha_desde`/`fecha_hasta`/`uuid_mesero`/
 * `page_size`). This mismatch is intentionally isolated to this one
 * interface/call — nothing above this file (query hook, filters UI,
 * `WaiterPerformanceFilterState`) ever sees or cares about wire casing.
 */
export interface WaiterPerformanceListParams {
  fechaDesde: string
  fechaHasta: string
  uuidMesero?: string
  page?: number
  pageSize?: number
}

function mapDesempenoMeseroToViewModel(
  record: DesempenoMeseroApiRecord,
): WaiterPerformanceRowViewModel {
  const apellidos = [record.apellido_paterno, record.apellido_materno]
    .filter((value): value is string => Boolean(value))
    .join(' ')
  return {
    uuidUsuario: record.uuid_usuario,
    nombreCompleto: `${record.nombre} ${apellidos}`.trim(),
    eventosTrabajados: record.eventos_trabajados,
    asistencias: record.asistencias,
    faltas: record.faltas,
    pagosAcumulados: record.pagos_acumulados,
    pagosRecibidos: record.pagos_recibidos,
    porCobrar: record.por_cobrar,
    calificacionesRecibidas: record.calificaciones_recibidas,
    promedioCalificacion: record.promedio_calificacion,
    calificacionesBajas: record.calificaciones_bajas,
    solicitudesAtendidas: record.solicitudes_atendidas,
    segundosRespuestaPromedio: record.segundos_respuesta_promedio,
  }
}

/**
 * Confirmed backend gap: `ReporteService.desempenoMeseros` resolves
 * `uuidMesero` through `IdentidadLocal.resolverPorUuid`
 * (`identidad_service.ts`), which throws `SGEB-1003` for a well-formed but
 * nonexistent uuid — the SAME code the rest of this app treats as "your
 * session is invalid" (`sgebCodes.ts`, `SocketProvider.tsx`,
 * `sgebClient.ts`'s own docs). `fetchWaiterPerformance` recognizes this one
 * narrow case (an application error with this exact code, on a request
 * that actually sent a `uuidMesero`) and rejects with this distinct error
 * instead, so the caller can show an honest "ese mesero ya no existe"
 * message rather than a misleading "tu sesión expiró" one. This never
 * changes `SGEB-1003` handling anywhere else in the app — see
 * `shared/api/sgebApiError.ts`'s own contract, unmodified.
 */
export class WaiterPerformanceInvalidWaiterError extends Error {}

/**
 * Fetches one page of the historical waiter-performance report through the
 * shared authenticated SGEB transport. `uuidMesero`/`page`/`pageSize` are
 * only sent when provided — the backend applies its own defaults
 * (`page=1`, `pageSize=25`) otherwise (`reporte_service.ts`). An empty
 * result (`SGEB-0002`) is not an error: `responder.lista` still answers
 * HTTP 200 with `data.items = []`, so this resolves normally with an empty
 * `items` array rather than throwing.
 */
export async function fetchWaiterPerformance(
  params: WaiterPerformanceListParams,
  signal?: AbortSignal,
): Promise<WaiterPerformancePageViewModel> {
  try {
    const envelope = await requestSgeb<DesempenoMeserosListApiRecord>({
      url: '/reportes/desempeno-meseros',
      params: {
        fechaDesde: params.fechaDesde,
        fechaHasta: params.fechaHasta,
        ...(params.uuidMesero ? { uuidMesero: params.uuidMesero } : {}),
        ...(params.page !== undefined ? { page: params.page } : {}),
        ...(params.pageSize !== undefined ? { pageSize: params.pageSize } : {}),
      },
      ...(signal ? { signal } : {}),
    })
    if (envelope.data === null) {
      // Never observed against the pinned backend — `responder.lista`
      // always returns the `{ items, meta }` object literal — guarded
      // defensively rather than assumed, same convention as
      // `fetchEventMermaSummary`.
      throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
    }
    return {
      items: envelope.data.items.map(mapDesempenoMeseroToViewModel),
      meta: {
        page: envelope.data.meta.page,
        pageSize: envelope.data.meta.page_size,
        total: envelope.data.meta.total,
        lastPage: envelope.data.meta.last_page,
        periodo: envelope.data.meta.periodo,
      },
    }
  } catch (error) {
    if (
      params.uuidMesero !== undefined &&
      isSgebApplicationError(error) &&
      error.code === SGEB_CODE.TOKEN_INVALID
    ) {
      throw new WaiterPerformanceInvalidWaiterError(
        'El mesero seleccionado ya no está disponible.',
      )
    }
    throw error
  }
}

/** Narrows a local `WaiterPerformanceFilterState` down to the params `fetchWaiterPerformance` sends — mirrors `useEventsListQuery.ts`'s `toListParams` convention. */
export function toWaiterPerformanceListParams(
  filters: WaiterPerformanceFilterState,
  page: number,
  pageSize: number,
): WaiterPerformanceListParams {
  return {
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    ...(filters.uuidMesero ? { uuidMesero: filters.uuidMesero } : {}),
    page,
    pageSize,
  }
}
