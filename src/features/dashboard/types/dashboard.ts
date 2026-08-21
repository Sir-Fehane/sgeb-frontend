import type { EventStatus, EventType } from '@/features/events/types/event'

/**
 * UI domain types for the SGEB captain dashboard (`GET /dashboard/capitan`).
 *
 * Confirmed directly against the pinned backend's `DashboardService.capitan`
 * (`app/modules/dashboard/services/dashboard_service.ts`) and
 * `DashboardController.capitan`, and — as of OpenAPI 1.13.0 — matching
 * `docs/api/openapi-sgeb.yaml`'s `DashboardCapitan` schema too: no query
 * parameters, no partial-success semantics, and exactly the fields below.
 * This type mirrors that shape — a portfolio-level events overview,
 * nothing else. The richer per-event operational concepts (staffing,
 * montaje, piso, barra, servicio/comensal, cierre, alertas) exist one level
 * down, on `GET /eventos/{id}/dashboard` — out of scope for this page.
 */

/**
 * One event row as embedded in `en_curso`/`proximos`/`por_cerrar` — the
 * `Evento` model's own `@column` fields, always serialized regardless of
 * which relations were preloaded (`app/modules/eventos/models/evento.ts`).
 * `capitan` is deliberately absent from this type: `DashboardService.capitan`
 * queries the captain's own events without `.preload('capitan')`, so that
 * relation never appears in this endpoint's response (Lucid only serializes
 * a preloaded relation) — unlike `features/events/types/event.ts`'s
 * `EventListItemViewModel`, which comes from `GET /eventos` and does
 * preload it.
 */
export interface DashboardEventViewModel {
  idEvento: number
  idSalon: number
  titulo: string
  tipo: EventType
  fecha: string
  horaPresentacion: string
  inicio: string
  fin: string | null
  cupoMeseros: number
  numMesas: number
  tarifaPorMesero: number
  estado: EventStatus
  /**
   * Present only for `enCurso`/`proximos` rows: `DashboardService.capitan`
   * preloads `salon` for the query those two come from, but NOT for
   * `por_cerrar` (a separate, unrelated query with no `.preload` at all) —
   * so this field is genuinely absent on `porCerrar` rows, not just
   * unpopulated. Rendered with the same "pendiente de integración" fallback
   * `EventListItem` already uses for the same reason.
   */
  salonNombre?: string
}

/**
 * Mirrors `DashboardCapitan`'s real, confirmed shape field-for-field
 * (camelCase renaming only). Every field is always present — the real
 * endpoint has no `null`/partial-success semantics at all.
 */
export interface CaptainDashboardViewModel {
  enCurso: readonly DashboardEventViewModel[]
  proximos: readonly DashboardEventViewModel[]
  /** Count only — the real endpoint does not return the draft events themselves, just how many exist. */
  borradores: number
  porCerrar: readonly DashboardEventViewModel[]
  totales: {
    enCurso: number
    proximos: number
    porCerrar: number
  }
}
