import type {
  AuditLogAction,
  AuditLogFilterState,
  AuditLogPageViewModel,
} from '@/features/audit-log/types/auditLog'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/** One row of `GET /admin/bitacora` — confirmed against `MovimientoBitacora`'s `@column` declarations (`app/modules/admin/models/movimiento_bitacora.ts`). `ip` carries `serializeAs: null` server-side and never appears here. */
interface MovimientoBitacoraApiRecord {
  id_bitacora: number
  tipo_entidad: string
  id_entidad: number | null
  accion: AuditLogAction
  uuid_usuario_responsable: string | null
  detalle: string
  timestamp: string
}

/** `responder.lista(ctx, p.all(), {page, page_size, total, last_page})` (`bitacora_controller.ts`) — `data` is `{items, meta}`, same shape convention `reportes/desempeno-meseros` uses, never a bare array despite what `openapi-sgeb.yaml` documents. */
interface BitacoraListApiRecord {
  items: MovimientoBitacoraApiRecord[]
  meta: {
    page: number
    page_size: number
    total: number
    last_page: number
  }
}

/**
 * `GET /admin/bitacora` query parameters this call actually sends —
 * confirmed against `bitacora_controller.ts`'s real validator: **camelCase**
 * (`tipoEntidad`, `uuidResponsable`, `fechaDesde`, `fechaHasta`, `pageSize`),
 * unlike what `openapi-sgeb.yaml` documents (`tipo_entidad`/
 * `uuid_usuario_responsable`/`fecha_desde`/`fecha_hasta`/`page_size`). No
 * `id_entidad` param: the real validator has none, despite the spec.
 */
export interface AuditLogListParams {
  fechaDesde: string
  fechaHasta: string
  tipoEntidad?: string
  accion?: AuditLogAction
  uuidResponsable?: string
  page?: number
  pageSize?: number
}

function mapMovimiento(
  record: MovimientoBitacoraApiRecord,
): AuditLogPageViewModel['items'][number] {
  return {
    idBitacora: record.id_bitacora,
    tipoEntidad: record.tipo_entidad,
    idEntidad: record.id_entidad,
    accion: record.accion,
    uuidUsuarioResponsable: record.uuid_usuario_responsable,
    detalle: record.detalle,
    timestamp: record.timestamp,
  }
}

/** Narrows a local `AuditLogFilterState` + page down to the params `fetchAuditLog` sends. */
export function toAuditLogListParams(
  filters: AuditLogFilterState,
  page: number,
  pageSize: number,
): AuditLogListParams {
  return {
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    ...(filters.tipoEntidad ? { tipoEntidad: filters.tipoEntidad } : {}),
    ...(filters.accion ? { accion: filters.accion } : {}),
    ...(filters.uuidResponsable ? { uuidResponsable: filters.uuidResponsable } : {}),
    page,
    pageSize,
  }
}

/**
 * Fetches one page of the system audit log (`GET /admin/bitacora`, admin
 * only server-side) through the shared authenticated SGEB transport. An
 * empty result is not an error: `responder.lista` still answers HTTP 200
 * with `data.items = []`.
 */
export async function fetchAuditLog(
  params: AuditLogListParams,
  signal?: AbortSignal,
): Promise<AuditLogPageViewModel> {
  const envelope = await requestSgeb<BitacoraListApiRecord>({
    url: '/admin/bitacora',
    params: { ...params },
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — `responder.lista` always
    // returns the `{items, meta}` object literal — guarded defensively
    // rather than assumed, same convention as `services/reportsApi.ts`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return {
    items: envelope.data.items.map(mapMovimiento),
    meta: {
      page: envelope.data.meta.page,
      pageSize: envelope.data.meta.page_size,
      total: envelope.data.meta.total,
      lastPage: envelope.data.meta.last_page,
    },
  }
}
