/**
 * UI domain types for the admin Bitácora (system audit log,
 * `feature/admin-users-roles-audit-live`), confirmed directly against the
 * pinned backend's `MovimientoBitacora` model
 * (`app/modules/admin/models/movimiento_bitacora.ts`), `BitacoraService`
 * (`app/modules/admin/services/bitacora_service.ts`), and
 * `BitacoraController`'s own validator
 * (`app/modules/admin/controllers/bitacora_controller.ts`).
 *
 * `openapi-sgeb.yaml` documents this endpoint incorrectly in three ways —
 * do not regenerate these types from the spec:
 * - Query params are snake_case there (`tipo_entidad`, `fecha_desde`, …);
 *   the real validator expects camelCase (`tipoEntidad`, `fechaDesde`, …).
 * - The spec's `accion` enum (`alta`/`actualizacion`/`cambio_estado`/`baja`)
 *   does not match the real one at all: `crear`/`actualizar`/`desactivar`/
 *   `activar`/`eliminar`/`aprobar`/`cancelar`.
 * - The spec documents an `id_entidad` filter param that does not exist in
 *   the real validator/service.
 */

/** `MovimientoBitacora.accion` — the real, confirmed enum (not OpenAPI's). */
export type AuditLogAction =
  'crear' | 'actualizar' | 'desactivar' | 'activar' | 'eliminar' | 'aprobar' | 'cancelar'

/**
 * `tipo_entidad` is a free string (≤40 chars) server-side, not a real enum —
 * confirmed against `bitacora_controller.ts`'s validator. These four are
 * every value this branch's backend audit found actually written by
 * `bitacora.registrar()` call sites today (`USUARIO`, `DATOS_BANCARIOS`,
 * `INVITACION`, `COMANDA_EVENTO`) — the filter UI offers exactly these as a
 * convenience, not a backend-enforced contract. A future backend module
 * could start logging a new entity type this list doesn't know about; rows
 * with an unrecognized `tipoEntidad` still render (see
 * `utils/auditLogPresentation.ts`'s fallback), they just aren't offered as a
 * named filter option ahead of time.
 */
export const KNOWN_AUDIT_LOG_ENTITY_TYPES = [
  'USUARIO',
  'DATOS_BANCARIOS',
  'INVITACION',
  'COMANDA_EVENTO',
] as const

export type KnownAuditLogEntityType = (typeof KNOWN_AUDIT_LOG_ENTITY_TYPES)[number]

export interface AuditLogEntryViewModel {
  idBitacora: number
  tipoEntidad: string
  idEntidad: number
  accion: AuditLogAction
  /** `null` for a system/automatic movement (e.g. a Cubaitor job) — never a missing-data placeholder. */
  uuidUsuarioResponsable: string | null
  /** Already a human-readable Spanish description composed server-side (e.g. "estado borrador → confirmado") — rendered as-is, never re-derived from `accion`/`tipoEntidad`. */
  detalle: string
  timestamp: string
}

export interface AuditLogPageMetaViewModel {
  page: number
  pageSize: number
  total: number
  lastPage: number
}

export interface AuditLogPageViewModel {
  items: readonly AuditLogEntryViewModel[]
  meta: AuditLogPageMetaViewModel
}

/**
 * Local filter state. `fechaDesde`/`fechaHasta` are both required (the
 * backend rejects a request missing either — same shape as
 * `reportes/desempeno-meseros`'s required range, see
 * `utils/auditLogValidation.ts` for the shared 366-day cap). `tipoEntidad`/
 * `accion`/`uuidResponsable` are all optional server-side filters.
 */
export interface AuditLogFilterState {
  fechaDesde: string
  fechaHasta: string
  tipoEntidad: string | null
  accion: AuditLogAction | null
  uuidResponsable: string | null
}

const DEFAULT_RANGE_DAYS = 30

/** `YYYY-MM-DD` from local date parts — never `toISOString()` (same reasoning `report.ts`'s identical helper documents). */
function toIsoDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The initial period shown when Bitácora first loads: the last 30 days up
 * to today — same practical, fast-loading default
 * `createDefaultWaiterPerformanceFilterState` documents, comfortably under
 * the backend's 366-day maximum (`bitacora_service.ts`).
 */
export function createDefaultAuditLogFilterState(
  today: Date = new Date(),
): AuditLogFilterState {
  const desde = new Date(today)
  desde.setDate(desde.getDate() - (DEFAULT_RANGE_DAYS - 1))
  return {
    fechaDesde: toIsoDateLocal(desde),
    fechaHasta: toIsoDateLocal(today),
    tipoEntidad: null,
    accion: null,
    uuidResponsable: null,
  }
}
