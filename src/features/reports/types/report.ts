/**
 * UI domain types for the Reports screen, rebuilt against real backend
 * capability (feature/operations-and-reports-live's audit). The previous
 * version of this feature was built entirely around `GET
 * /dashboard/meseros` as documented in `openapi-sgeb.yaml` — confirmed
 * against the pinned backend to be a DIFFERENT endpoint in practice: it
 * returns the CALLING user's own upcoming events/notifications/amount
 * owed (`DashboardService.meseros`), never a paginated, filterable,
 * cross-waiter performance table. No backend endpoint answering that
 * documented shape exists at all — see this branch's report. Waiter
 * performance is therefore an honest deferred state (`ReportsPerformanceDeferredSection`),
 * not a wired report.
 *
 * What IS real and event-scoped: merma (waste) totals
 * (`GET /eventos/{id}/reportes-merma`) and diner ratings
 * (`GET /eventos/{id}/calificaciones`, capitán/admin only). Payments
 * already have their own real, dedicated screen
 * (`/eventos/{id}/pagos`) — Reports only deep-links to it, never
 * re-fetches or re-renders payment data.
 */

/**
 * `GET /eventos/{id}/reportes-merma`'s two aggregate fields the pinned
 * backend already computes server-side — `reportesCount` is this
 * feature's own derived count of the `reportes` array length, the other
 * two are direct passthroughs.
 */
export interface EventMermaSummaryViewModel {
  reportesCount: number
  costoTotal: number
  piezasSinCostear: number
}

/**
 * One `Calificacion` row — confirmed field-for-field against the pinned
 * backend model. `id_participacion` identifies the mesero being rated;
 * this feature never resolves it to a name (no waiter-directory
 * integration exists here — see `services/reportsApi.ts`), so it renders
 * only as a numeric reference. The diner's own identity
 * (`token_comensal`) is never exposed by the backend at all — anonymity
 * is enforced server-side, not just a frontend convention.
 */
export interface EventRatingViewModel {
  idCalificacion: number
  idMesa: number
  idParticipacion: number
  puntuacion: number
  comentario: string | null
  creadaEn: string
}

/**
 * `GET /eventos/{id}/calificaciones`'s response — `promedio` is `null`,
 * never `0`, when `calificaciones` is empty (same reasoning the dashboard
 * endpoint's `servicio.promedio_calificacion` documents).
 */
export interface EventRatingsSummaryViewModel {
  calificaciones: readonly EventRatingViewModel[]
  total: number
  promedio: number | null
}

/**
 * One row of `GET /reportes/desempeno-meseros` — confirmed field-for-field
 * against the pinned backend (`ReporteService.desempenoMeseros`,
 * `reporte_service.ts`). Unlike every other type in this file, this report
 * is NOT scoped to one event: it aggregates a mesero's participation across
 * every non-cancelled event in the requested date range (see
 * `services/reportsApi.ts`'s mapping comment for exact per-field
 * semantics).
 *
 * `puntualidad` is deliberately NOT a field here: the pinned backend always
 * returns it as `null` — a metric the team explicitly discarded (August
 * 2026), not one pending implementation (see `reporte_service.ts`'s own
 * comment) — so this view model never carries a field that could only ever
 * render as "sin datos". Re-add it here (and thread it through
 * `services/reportsApi.ts`) only if the backend ever starts computing it
 * for real.
 */
export interface WaiterPerformanceRowViewModel {
  uuidUsuario: string
  nombreCompleto: string
  eventosTrabajados: number
  asistencias: number
  faltas: number
  pagosAcumulados: number
  pagosRecibidos: number
  porCobrar: number
  calificacionesRecibidas: number
  promedioCalificacion: number | null
  calificacionesBajas: number
  solicitudesAtendidas: number
  segundosRespuestaPromedio: number | null
}

/** The date range the backend actually applied — echoed back by `responder.lista`'s `meta.periodo` (`reportes_controller.ts`), not merely a copy of what was requested. */
export interface WaiterPerformancePeriodViewModel {
  desde: string
  hasta: string
}

/** `responder.lista`'s pagination meta for this endpoint — `page`/`pageSize` mirror what was requested (or the backend's defaults), `total`/`lastPage` are server-computed. */
export interface WaiterPerformancePageMetaViewModel {
  page: number
  pageSize: number
  total: number
  lastPage: number
  periodo: WaiterPerformancePeriodViewModel
}

export interface WaiterPerformancePageViewModel {
  items: readonly WaiterPerformanceRowViewModel[]
  meta: WaiterPerformancePageMetaViewModel
}

/**
 * Local filter state for the historical waiter-performance report.
 * `fechaDesde`/`fechaHasta` are both required by the backend's own
 * validator (`desempenoValidator`, `reportes_controller.ts` — missing
 * either throws `SGEB-2001`); `uuidMesero` `null` means "Todos los
 * meseros", the real optional filter, never an empty-string sentinel sent
 * to the server.
 */
export interface WaiterPerformanceFilterState {
  fechaDesde: string
  fechaHasta: string
  uuidMesero: string | null
}

const DEFAULT_RANGE_DAYS = 30

/** `YYYY-MM-DD` from local date parts — never `toISOString()`, which converts to UTC first and can roll the date back a day in a negative-offset timezone (same reasoning `formatEventDate` documents). */
function toIsoDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The initial period shown when the historical report first loads: the
 * last 30 days up to today. No existing Reports/date-filter convention
 * establishes a default range to follow here — `EventsFilters` ships with
 * both dates unset because `GET /eventos` doesn't require them, but this
 * endpoint's `fechaDesde`/`fechaHasta` ARE required, so an empty initial
 * state isn't an option. 30 days is a practical, fast-loading default,
 * comfortably under the backend's 366-day maximum (`MAX_DIAS`,
 * `reporte_service.ts`) — documented here as a deliberate product decision,
 * not a discovered backend semantic.
 */
export function createDefaultWaiterPerformanceFilterState(
  today: Date = new Date(),
): WaiterPerformanceFilterState {
  const desde = new Date(today)
  desde.setDate(desde.getDate() - (DEFAULT_RANGE_DAYS - 1))
  return {
    fechaDesde: toIsoDateLocal(desde),
    fechaHasta: toIsoDateLocal(today),
    uuidMesero: null,
  }
}
