/**
 * UI domain types for the SGEB waiters directory, confirmed directly
 * against the pinned backend's `Usuario` model
 * (`app/modules/identidad/models/usuario.ts`), `UsuarioService.listar`
 * (`app/modules/identidad/services/usuario_service.ts`), and
 * `filtrosUsuarioValidator` (`app/modules/identidad/validators/usuario_validator.ts`)
 * — `GET /usuarios?rol=mesero` is the real, live waiter-directory source.
 *
 * There is no separate `MESERO` operational entity: "mesero" is a role on
 * `Usuario` (`id_rol`), an invitation record (`auth.invitacion`, see
 * `types/invitation.ts`), and a per-event `participacion_evento` row — three
 * distinct things this feature never conflates (see this branch's report).
 * This directory only ever lists the first: global accounts with the
 * mesero role, independent of any event.
 *
 * The identifier ambiguity a previous branch flagged here is resolved:
 * `Usuario.id_usuario` never serializes at all (`serializeAs: null`) — only
 * `uuid_usuario` ever leaves the backend, for every `/usuarios*` endpoint.
 * `id` below is that real, confirmed `uuid_usuario`.
 */

/** `Usuario.activo` (boolean) — the only documented account status. */
export type WaiterAccountStatus = 'activo' | 'inactivo'

/**
 * A presentation model for one row of the waiters directory, mapped from
 * the real `Usuario` wire record (`services/waitersApi.ts`).
 * `nombreCompleto` joins `nombre` + `apellido_paterno` + `apellido_materno`
 * — a display decision this feature owns, not a documented API field;
 * `correo`, `telefono` (nullable), and `estadoCuenta` (from `activo`) map
 * 1:1 to `Usuario` fields.
 */
export interface WaiterListItemViewModel {
  id: string
  nombreCompleto: string
  correo: string
  telefono: string | null
  estadoCuenta: WaiterAccountStatus
}

/**
 * Local, typed filter state. Both fields map to real, confirmed
 * `GET /usuarios` query parameters (`filtrosUsuarioValidator`):
 * `estadoCuenta` -> `activo`, `search` -> `q` (server-side substring match
 * against `nombre`/`apellido_paterno`/`correo`, `UsuarioService.listar`).
 * Both are sent to the server, not filtered client-side — see
 * `queries/useWaitersQuery.ts`.
 */
export interface WaitersFilterState {
  estadoCuenta: WaiterAccountStatus | 'todos'
  search: string
}

export const DEFAULT_WAITERS_FILTER_STATE: WaitersFilterState = {
  estadoCuenta: 'todos',
  search: '',
}
