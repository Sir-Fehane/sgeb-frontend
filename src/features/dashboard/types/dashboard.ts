/**
 * UI domain types for the SGEB captain dashboard, derived directly from
 * docs/api/openapi-sgeb.yaml v1.6.0's `DashboardCapitan` and
 * `AlertaOperativa` schemas (`GET /dashboard/capitan`). Every type below
 * states whether it mirrors the OpenAPI schema field-for-field
 * (camelCase renaming only) or is a presentation-only construct.
 *
 * Every event/alert identifier here is an opaque presentation value —
 * never parsed, validated, or used to construct a route (no
 * event-detail or live-operation route is approved this branch).
 */

/**
 * `EVENTO.estado` — the same enum openapi-sgeb.yaml documents for
 * `proximos_eventos[].estado`. Defined locally (not imported from
 * `features/events`) so this feature stays decoupled — see
 * `features/events/types/event.ts` for the events feature's own copy.
 */
export type DashboardEventStatus =
  'borrador' | 'publicado' | 'en_curso' | 'finalizado' | 'cancelado'

/** `AlertaOperativa.tipo` — exact enum, no other values documented. */
export type AlertType =
  | 'botella_vacia'
  | 'insumo_agotado'
  | 'cubaitor_sin_conexion'
  | 'dispensado_error'
  | 'checklist_pendiente'
  | 'llegada_fallida'
  | 'calificacion_baja'

/** `AlertaOperativa.severidad` — exact enum. */
export type AlertSeverity = 'informativa' | 'atencion' | 'critica'

/** `AlertaOperativa.estado` — exact enum. */
export type AlertState = 'abierta' | 'atendida'

/** Mirrors `DashboardCapitan.rango` exactly. */
export interface DashboardRange {
  fechaDesde: string
  fechaHasta: string
}

/**
 * Mirrors `DashboardCapitan.resumen` exactly (a count object, not a
 * presentation model) — `null` when excluded via `secciones` or
 * unavailable per SGEB-0004.
 */
export interface DashboardResumen {
  total: number
  borrador: number
  publicados: number
  enCurso: number
  finalizados: number
  cancelados: number
}

/**
 * Mirrors one item of `DashboardCapitan.proximos_eventos` exactly.
 */
export interface UpcomingEventViewModel {
  idEvento: string
  titulo: string
  fecha: string
  horaPresentacion: string
  salon: string
  estado: DashboardEventStatus
  cupoMeseros: number
  confirmados: number
  porcentajeCobertura: number
}

/**
 * Mirrors one item of `DashboardCapitan.staffing_riesgo` exactly —
 * documented as the actionable source for an "Invitar meseros" action
 * (see `StaffingRiskSection`'s comment for why that action is disabled
 * on this branch).
 */
export interface StaffingRiskViewModel {
  idEvento: string
  titulo: string
  horasParaInicio: number
  faltantes: number
}

/**
 * Mirrors `DashboardCapitan.operacion` exactly. `idEvento`/`titulo` are
 * both `null` when there is no event currently `en_curso` — that is a
 * valid, documented state, not "unavailable".
 */
export interface CurrentOperationViewModel {
  idEvento: string | null
  titulo: string | null
  meserosEnPiso: number
  mesasOcupadas: number
  mesasTotal: number
  ordenesActivas: number
  solicitudesPendientes: number
}

/** Mirrors `DashboardCapitan.cierre` exactly. */
export interface ClosingSummaryViewModel {
  eventosSinPagosCalculados: number
  pagosPendientes: number
  montoPendiente: number
  mermaCostoEstimado: number
  calificacionPromedio: number | null
}

/**
 * Mirrors the presentation-relevant fields of `AlertaOperativa`.
 * `technical_message` does not exist on this schema and must never be
 * rendered; `codigoRelacionado` is kept only for support-facing
 * traceability, never as the primary user-facing message (`mensaje` is).
 */
export interface OperationalAlertViewModel {
  idAlerta: string
  tipo: AlertType
  severidad: AlertSeverity
  mensaje: string
  codigoRelacionado: string | null
  estado: AlertState
  creadaEn: string
}

/**
 * Presentation model for the full dashboard payload — mirrors
 * `DashboardCapitan` field-for-field, with every section kept nullable
 * exactly as documented. This is a necessary camelCase re-typing of a
 * schema that *is* fully documented (unlike the events/waiters
 * features' synthesized view models), so this one may be treated as an
 * accurate mirror of the OpenAPI contract, not a guess.
 */
export interface CaptainDashboardViewModel {
  generadoEn: string
  rango: DashboardRange
  resumen: DashboardResumen | null
  proximosEventos: readonly UpcomingEventViewModel[] | null
  staffingRiesgo: readonly StaffingRiskViewModel[] | null
  operacion: CurrentOperationViewModel | null
  cierre: ClosingSummaryViewModel | null
  alertas: readonly OperationalAlertViewModel[] | null
}

/**
 * Local, typed filter state for the date-range controls — mirrors
 * `fecha_desde`/`fecha_hasta` exactly. `secciones` is deliberately NOT
 * modeled here: it is a future request-optimization parameter, not a
 * documented user-facing filter/wireframe control (see
 * `DashboardDateRangeFilters`'s comment).
 */
export interface DashboardDateFilterState {
  fechaDesde: string
  fechaHasta: string
}
