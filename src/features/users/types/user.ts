/**
 * UI domain types for the admin Users directory
 * (`feature/admin-users-roles-audit-live`), confirmed directly against the
 * pinned backend's `Usuario`/`Rol` models
 * (`app/modules/identidad/models/usuario.ts`,
 * `app/modules/identidad/models/rol.ts`), `UsuarioService`
 * (`app/modules/identidad/services/usuario_service.ts`), and
 * `filtrosUsuarioValidator`/`actualizarUsuarioValidator`/`estadoUsuarioValidator`
 * (`app/modules/identidad/validators/usuario_validator.ts`).
 *
 * Distinct from `features/waiters/types/waiter.ts`: that feature is a
 * mesero-only recruitment directory hardcoded to `rol=mesero`. This one is
 * the general capitán/admin account directory across all three roles —
 * neither duplicates the other's screen, both independently map the same
 * `Usuario` wire record (same "small per-feature DTO duplication over a
 * shared abstraction" convention `services/usersApi.ts` documents).
 *
 * Role is NEVER editable here: the pinned backend has no role-change
 * endpoint at all (`actualizarUsuarioValidator` only accepts
 * `nombre`/`apellidoPaterno`/`apellidoMaterno`/`telefono` — confirmed, not
 * a documentation gap). A user's role is fixed at creation/invitation time.
 */

/** `Rol.nombre` — the fixed, three-value system catalog (`GET /roles`). */
export type UserRoleName = 'admin' | 'capitan' | 'mesero'

/** `Usuario.activo` (boolean) — the only documented account status. */
export type UserAccountStatus = 'activo' | 'inactivo'

export interface UserRoleViewModel {
  idRol: number
  nombre: UserRoleName
  descripcion: string | null
}

/**
 * One row of the directory / one user's detail — this backend has no
 * separate "summary vs. detail" shape (`GET /usuarios` and
 * `GET /usuarios/{uuid}` both return the same `Usuario` fields), so a
 * single view model covers both.
 */
export interface UserViewModel {
  uuidUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  nombreCompleto: string
  correo: string
  telefono: string | null
  rol: UserRoleViewModel | null
  estadoCuenta: UserAccountStatus
  creadoEn: string
}

/**
 * Local, typed filter state. All three map to real, confirmed `GET
 * /usuarios` query parameters (`filtrosUsuarioValidator`): `rol` -> `rol`,
 * `estadoCuenta` -> `activo`, `search` -> `q` (server-side substring match
 * against nombre/apellido_paterno/correo). Sent to the server, never
 * filtered client-side — same convention as `WaitersFilterState`.
 *
 * No pagination field: the pinned backend's `GET /usuarios` has none
 * (`page`/`page_size` are silently ignored) — faking client-side pagination
 * over a server response that's already the full result set would misrepresent
 * "page 2" as loading more data when it never does.
 */
export interface UsersFilterState {
  rol: UserRoleName | 'todos'
  estadoCuenta: UserAccountStatus | 'todos'
  search: string
}

export const DEFAULT_USERS_FILTER_STATE: UsersFilterState = {
  rol: 'todos',
  estadoCuenta: 'todos',
  search: '',
}

/**
 * `PUT /usuarios/{uuid}` request body — exact field set confirmed against
 * `actualizarUsuarioValidator`. No `correo`, `rol`, or `activo`: correo has
 * no update path anywhere in this API, role is immutable (see this file's
 * module comment), and status changes go through the separate
 * `PATCH /usuarios/{uuid}` (`setUserActive` in `services/usersApi.ts`).
 */
export interface UpdateUserRequest {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno?: string | null
  telefono?: string | null
}
