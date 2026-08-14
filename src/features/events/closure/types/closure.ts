/**
 * UI domain types for "Cierre del evento" — closure-readiness diagnostics
 * and merma (waste) reporting, derived from docs/api/openapi-sgeb.yaml
 * v1.6.0's `Cierre` endpoints. This branch is EVENT CLOSURE only — no
 * payment calculation, no payment mutations, no W-08 (Bebidas y
 * Cubaitor). See this feature's README section for the full boundary.
 */

/**
 * `GET /eventos/{id_evento}/cierre`'s documented 200 response — this is a
 * rare case in this codebase where a genuine, fully-typed response schema
 * IS documented (most endpoints here only echo the generic `Exito`/
 * `ExitoLista` envelope). Field-for-field mapping, camelCase only:
 *
 * - eventoFinalizado ← `evento_finalizado`
 * - participacionesTotal ← `participaciones_total`
 * - participacionesSinSalida ← `participaciones_sin_salida` (blocks
 *   SGEB-4015 at `/pagos/calcular`)
 * - meserosSinClabeVigente ← `meseros_sin_clabe_vigente` (blocks
 *   SGEB-4012 at `/pagos/calcular`)
 * - listo ← `listo`, documented as "true cuando los tres bloqueos están
 *   resueltos" — a SERVER-DERIVED value. This frontend never recomputes
 *   it from the other four fields; fixtures only keep it logically
 *   consistent for demo coherence (see `fixtures/closureFixtures.ts`'s
 *   dev-only consistency check), the same way `estadoParticipacion`
 *   in the Attendance foundation is never re-derived client-side.
 *
 * `participacionesSinSalida` and `meserosSinClabeVigente` are COUNTS
 * only — the endpoint documents no participant/mesero identity alongside
 * them, so this feature never renders fictional per-person rows derived
 * from these numbers (see README's "Blocker semantics" note).
 */
export interface EventClosureReadinessViewModel {
  eventoFinalizado: boolean
  participacionesTotal: number
  participacionesSinSalida: number
  meserosSinClabeVigente: number
  listo: boolean
}

/**
 * `POST /eventos/{id_evento}/reportes-merma`'s documented request body
 * enum — exactly these five values, nothing invented.
 */
export type WasteType =
  'vaso_roto' | 'plato_roto' | 'copa_rota' | 'comida_desperdiciada' | 'otro'

/**
 * One existing merma detail line. `GET /eventos/{id}/reportes-merma`
 * responds with the generic `ExitoLista` envelope — no named response
 * schema is documented in `openapi-sgeb.yaml` — but the exact shape is now
 * confirmed by direct inspection of the pinned backend
 * (`app/modules/cierre/models/merma_detalle.ts`): every field is always
 * present (nullable columns still serialize, never omitted).
 */
export interface MermaDetailViewModel {
  tipo: WasteType
  descripcion: string | null
  cantidad: number
  costoEstimado: number | null
}

/**
 * One existing merma report. Same documentation-gap-but-backend-confirmed
 * status as `MermaDetailViewModel` — shape confirmed against
 * `app/modules/cierre/models/reporte_merma.ts`.
 *
 * `idReporte` is the real backend `id_reporte` (a plain auto-increment
 * integer, per `ReporteMerma`'s `@column({ isPrimary: true, columnName:
 * 'id_reporte' })`) — no longer a presentation-only demo key.
 */
export interface MermaReportViewModel {
  idReporte: number
  fecha: string
  observaciones: string | null
  detalles: readonly MermaDetailViewModel[]
}
