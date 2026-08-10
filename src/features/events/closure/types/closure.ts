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
 * One existing merma detail line, for READ-side presentation only.
 * `GET /eventos/{id}/reportes-merma` responds with the generic
 * `ExitoLista` envelope — no named response schema exists for this list,
 * so this shape is inferred from the POST body's field names
 * (`tipo`/`descripcion`/`cantidad`/`costo_estimado`), not a confirmed
 * response DTO. Do not treat this as a literal documented read shape.
 */
export interface MermaDetailViewModel {
  tipo: WasteType
  descripcion?: string | null
  cantidad: number
  costoEstimado?: number | null
}

/**
 * One existing merma report, for READ-side presentation only — same
 * documentation-gap caveat as `MermaDetailViewModel`.
 *
 * `idReporteDemo` is an explicitly PRESENTATION-ONLY/demo React key, never
 * a claimed backend `id_reporte` — no such identifier is documented on
 * the GET response, and this frontend never fabricates one for real use.
 * `fecha` is a presentation-only convenience with the same status as
 * `EventListItemViewModel.salonNombre` elsewhere in this app: `REPORTE_MERMA`
 * is a real named entity in the data dictionary's module table, so a
 * creation timestamp plausibly exists on it, but no exact field name is
 * confirmed in `openapi-sgeb.yaml` or the (unreadable in this environment)
 * data dictionary PDF for this specific response — never claimed as wire
 * truth.
 */
export interface MermaReportViewModel {
  idReporteDemo: string
  fecha?: string
  observaciones?: string | null
  detalles: readonly MermaDetailViewModel[]
}
