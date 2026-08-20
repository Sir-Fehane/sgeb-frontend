import type {
  EventClosureReadinessViewModel,
  MermaReportViewModel,
  WasteType,
} from '@/features/events/closure/types/closure'
import { changeEventoEstado } from '@/features/events/services/eventsApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of `GET /eventos/{id_evento}/cierre` — confirmed field-for-field
 * against both `openapi-sgeb.yaml` and the pinned backend's
 * `CierreService.verificarCierre` (`app/modules/cierre/services/cierre_service.ts`).
 */
export interface ClosureReadinessApiRecord {
  evento_finalizado: boolean
  participaciones_total: number
  participaciones_sin_salida: number
  meseros_sin_clabe_vigente: number
  listo: boolean
}

/** Wire shape of one `MermaDetalle` row, confirmed against `app/modules/cierre/models/merma_detalle.ts`. */
export interface MermaDetalleApiRecord {
  id_merma_det: number
  id_reporte: number
  tipo: WasteType
  descripcion: string | null
  cantidad: number
  costo_estimado: number | null
}

/** Wire shape of one `ReporteMerma` row (with `detalles` preloaded), confirmed against `app/modules/cierre/models/reporte_merma.ts`. */
export interface ReporteMermaApiRecord {
  id_reporte: number
  id_evento: number
  observaciones: string | null
  fecha: string
  detalles: MermaDetalleApiRecord[]
}

/**
 * Wire shape of `GET /eventos/{id_evento}/reportes-merma`'s `data`,
 * confirmed against `CierreService.listarMermas`. `costo_total`/
 * `piezas_sin_costear` are server-computed aggregates this feature does
 * not currently surface — `EventClosureWasteReportsSection` already
 * computes its own per-report total client-side from `detalles`, and per
 * CLAUDE.md/this branch's scope ("do not expand product behavior merely
 * because the backend exposes extra data"), no new UI is added just
 * because these two aggregate fields exist in the same response.
 */
export interface ReportesMermaListApiRecord {
  reportes: ReporteMermaApiRecord[]
  costo_total: number
  piezas_sin_costear: number
}

/**
 * Wire shape of `POST /eventos/{id_evento}/reportes-merma`'s request body.
 *
 * CONFIRMED MISMATCH: `costoEstimado` is camelCase on the real wire
 * request, not the `costo_estimado` `openapi-sgeb.yaml` documents —
 * verified directly against `app/modules/cierre/validators/cierre_validator.ts`
 * (`vine.object({ ..., costoEstimado: vine.number()... })`) and the
 * backend's own unit tests (`tests/unit/cierre.spec.ts`, which POST
 * `{ tipo, cantidad, costoEstimado }`). See this branch's final report.
 */
export interface CreateMermaDetalleRequest {
  tipo: WasteType
  descripcion?: string | null
  cantidad: number
  costoEstimado?: number | null
}

export interface CreateMermaReportRequest {
  observaciones?: string | null
  detalles: CreateMermaDetalleRequest[]
}

function mapClosureReadiness(
  record: ClosureReadinessApiRecord,
): EventClosureReadinessViewModel {
  return {
    eventoFinalizado: record.evento_finalizado,
    participacionesTotal: record.participaciones_total,
    participacionesSinSalida: record.participaciones_sin_salida,
    meserosSinClabeVigente: record.meseros_sin_clabe_vigente,
    listo: record.listo,
  }
}

function mapMermaReport(record: ReporteMermaApiRecord): MermaReportViewModel {
  return {
    idReporte: record.id_reporte,
    fecha: record.fecha,
    observaciones: record.observaciones,
    detalles: record.detalles.map((detalle) => ({
      tipo: detalle.tipo,
      descripcion: detalle.descripcion,
      cantidad: detalle.cantidad,
      costoEstimado: detalle.costo_estimado,
    })),
  }
}

/**
 * Fetches the closure-readiness diagnostic through the shared authenticated
 * SGEB transport. Lets `SgebApplicationError`/`SgebNetworkError` (including
 * `SGEB-3001` for an unknown event) propagate unchanged — the caller
 * decides how to present each outcome, same as `fetchEventoDetalle`.
 */
export async function fetchClosureReadiness(
  idEvento: number,
  signal?: AbortSignal,
): Promise<EventClosureReadinessViewModel> {
  const envelope = await requestSgeb<ClosureReadinessApiRecord>({
    url: `/eventos/${String(idEvento)}/cierre`,
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — `verificarCierre` always
    // returns the diagnostic object — guarded defensively rather than
    // assumed, same as `fetchEventoDetalle`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapClosureReadiness(envelope.data)
}

/**
 * Fetches existing merma reports for the event. Only `reportes` is mapped
 * into the view model — see `ReportesMermaListApiRecord`'s comment for why
 * `costo_total`/`piezas_sin_costear` are intentionally left unused.
 */
export async function fetchMermaReports(
  idEvento: number,
  signal?: AbortSignal,
): Promise<MermaReportViewModel[]> {
  const envelope = await requestSgeb<ReportesMermaListApiRecord>({
    url: `/eventos/${String(idEvento)}/reportes-merma`,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data?.reportes ?? []).map(mapMermaReport)
}

/**
 * `POST /eventos/{id_evento}/reportes-merma` — the one real captain
 * mutation this screen performs. `request` must already be in the real
 * wire shape (`costoEstimado` camelCase) — the caller
 * (`useCreateMermaReportMutation`) is responsible for translating the
 * form's `costo_estimado`-keyed values before calling this.
 */
export async function createMermaReport(
  idEvento: number,
  request: CreateMermaReportRequest,
): Promise<MermaReportViewModel> {
  const envelope = await requestSgeb<ReporteMermaApiRecord>({
    url: `/eventos/${String(idEvento)}/reportes-merma`,
    method: 'POST',
    data: request,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful
    // registration always returns the created report — guarded
    // defensively rather than assumed, same as `approveChecklistInstancia`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapMermaReport(envelope.data)
}

/**
 * `PATCH /eventos/{id_evento}/estado` with `{ estado: 'finalizado' }` — the
 * one transition Closure owns: `en_curso → finalizado`. Delegates to
 * `eventsApi.ts`'s `changeEventoEstado`, the one shared implementation of
 * this endpoint (added alongside the new lifecycle feature's
 * publish/start/return-to-draft/cancel actions, which need the exact same
 * request shape for the other transitions) — extracting it avoids two
 * independent implementations of one endpoint without touching this
 * function's own behavior, mutation, or tests: same URL, same method, same
 * body, same null-data guard, same error propagation.
 *
 * `changeEventoEstado` itself resolves to `void` (see its own comment for
 * why — a confirmed backend gap: `cambiarEstado`'s response never
 * preloads `capitan`, unlike `obtener`/`listar`). Closure readiness /
 * Event Detail / the events list only ever learn the new state through
 * their own authoritative refetch after cache invalidation
 * (`useFinalizeEventoMutation`), never from this response body.
 */
export async function finalizeEvento(idEvento: number): Promise<void> {
  await changeEventoEstado(idEvento, 'finalizado')
}
