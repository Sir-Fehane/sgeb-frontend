/**
 * UI domain types for the SGEB waiters directory, derived from
 * docs/api/documentacion-endpoints.txt's `Usuario` schema and
 * `GET /usuarios?rol=mesero` — the only documented "waiter directory"
 * data source. There is no separate `MESERO` table anywhere in the
 * 29-table data dictionary; "operational waiter record" and "SSO user
 * account" are NOT modeled as two different entities here because no
 * source defines a second one — this feature only ever has the one
 * `Usuario`-shaped record to work with.
 *
 * Identifier note: `Usuario.id_usuario` is a plain `integer` in the SGEB
 * schema, while the SSO documentation states `id_usuario` (INT) "jamás
 * sale del backend" and that only `uuid_usuario` is ever exposed
 * (docs/FrontendArchitecture.md §8.1) — an unresolved conflict, visible
 * directly in this endpoint's own documented response shape. This
 * feature does not decide which is correct: any waiter identifier is
 * treated as an opaque string, never parsed, validated, or assumed to
 * be either an integer or a UUID.
 *
 * Explicitly NOT defined here (would be premature/dead abstractions,
 * not backed by any usable-here field):
 * - A per-event "operational status" (`PARTICIPACION_EVENTO.estado`)
 *   requires an `id_evento` context this directory page doesn't have.
 * - "Invitation status" cannot appear on a waiter list item at all: no
 *   `GET /auth/invitaciones` list endpoint is documented, and an invited
 *   person has no `USUARIO` row yet (invitations and registered waiters
 *   are disjoint, not two states of the same record).
 * - A "rating" or "completed events" aggregate — `CALIFICACION` is
 *   per-event and anonymous, and `GET /dashboard/meseros` (RF-38, which
 *   would aggregate this) is a separate, contract-pending dashboard
 *   screen (§7.1), not this directory.
 */

/**
 * Derived from `Usuario.activo` (boolean) — the only documented account
 * status. There is no separate "operational" waiter status in any
 * source.
 */
export type WaiterAccountStatus = 'activo' | 'inactivo'

/**
 * A presentation model for one row of the waiters directory — NOT the
 * `Usuario` API response verbatim, and NOT a confirmed backend DTO.
 * Field-by-field sourcing: `nombreCompleto` derives from
 * `Usuario.nombre` + `apellido_paterno` + `apellido_materno` (the join
 * is a display decision this feature owns, not a documented API
 * field); `correo`, `telefono` (nullable), and `estadoCuenta` (from
 * `activo`) map 1:1 to `Usuario` fields.
 *
 * `id` is a neutral, opaque presentation identity — deliberately NOT
 * named `idUsuario` or `uuidUsuario`. The documentation does not
 * resolve whether the frontend will ultimately receive `id_usuario`
 * (SGEB's plain integer) or `uuid_usuario` (SSO's stated public
 * identifier) for this record — see the identifier note above. This
 * field must never be displayed as visible text, and must never be
 * parsed, validated, or used to infer either identifier's format; it
 * only ever travels as an opaque argument to a selection callback.
 */
export interface WaiterListItemViewModel {
  id: string
  nombreCompleto: string
  correo: string
  telefono: string | null
  estadoCuenta: WaiterAccountStatus
}

/**
 * Local, typed filter state. Mirrors the one query parameter from
 * `GET /usuarios` that's meaningful once already scoped to
 * `rol=mesero`: `activo`. No text-search, invitation-status,
 * availability, or event-assignment filter is documented.
 */
export interface WaitersFilterState {
  estadoCuenta: WaiterAccountStatus | 'todos'
}

export const DEFAULT_WAITERS_FILTER_STATE: WaitersFilterState = {
  estadoCuenta: 'todos',
}
