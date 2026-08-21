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
