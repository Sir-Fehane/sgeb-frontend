import type {
  UpdateUserRequest,
  UserRoleName,
  UsersFilterState,
  UserViewModel,
} from '@/features/users/types/user'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of one row in `GET /usuarios` / `GET /usuarios/{uuid}` /
 * `PUT /usuarios/{uuid}` / `PATCH /usuarios/{uuid}` — confirmed against
 * `Usuario`'s own `@column`/`@belongsTo` declarations
 * (`app/modules/identidad/models/usuario.ts`). `id_usuario`/`id_rol` both
 * carry `serializeAs: null` and never appear on the wire; role only ever
 * arrives as the preloaded `rol` relation, a nested object — never a flat
 * string, unlike what `openapi-sgeb.yaml` documents.
 *
 * `rol` is modeled as optional here rather than required: `UsuarioService.listar`
 * is confirmed to always `.preload('rol')`, but the pinned backend audit for
 * this branch did not independently confirm the same for the detail/update/
 * status-change responses — `mapUsuarioToUser` degrades to `rol: null`
 * rather than assuming, so an unconfirmed gap here fails safe (an
 * unlabeled row) instead of throwing.
 */
export interface UsuarioApiRecord {
  uuid_usuario: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  correo: string
  telefono: string | null
  activo: boolean
  creado_en: string
  rol?: {
    id_rol: number
    nombre: UserRoleName
    descripcion: string | null
    activo: boolean
  } | null
}

/**
 * `GET /usuarios` query parameters this call actually sends — confirmed
 * against `filtrosUsuarioValidator`
 * (`app/modules/identidad/validators/usuario_validator.ts`). No
 * `page`/`page_size`: the real backend has no pagination on this endpoint at
 * all (confirmed against `UsuarioService.listar` — an unpaginated query
 * ordered by `nombre`), unlike what `openapi-sgeb.yaml` documents.
 */
export interface UsersListParams {
  rol?: UserRoleName
  activo?: boolean
  q?: string
}

function mapUsuarioToUser(record: UsuarioApiRecord): UserViewModel {
  const apellidos = [record.apellido_paterno, record.apellido_materno]
    .filter((value): value is string => Boolean(value))
    .join(' ')
  return {
    uuidUsuario: record.uuid_usuario,
    nombre: record.nombre,
    apellidoPaterno: record.apellido_paterno,
    apellidoMaterno: record.apellido_materno,
    nombreCompleto: `${record.nombre} ${apellidos}`.trim(),
    correo: record.correo,
    telefono: record.telefono,
    rol: record.rol
      ? {
          idRol: record.rol.id_rol,
          nombre: record.rol.nombre,
          descripcion: record.rol.descripcion,
        }
      : null,
    estadoCuenta: record.activo ? 'activo' : 'inactivo',
    creadoEn: record.creado_en,
  }
}

/** Narrows a local `UsersFilterState` down to the params `fetchUsers` sends. */
export function toUsersListParams(filters: UsersFilterState): UsersListParams {
  return {
    ...(filters.rol !== 'todos' ? { rol: filters.rol } : {}),
    ...(filters.estadoCuenta !== 'todos'
      ? { activo: filters.estadoCuenta === 'activo' }
      : {}),
    ...(filters.search.trim() ? { q: filters.search.trim() } : {}),
  }
}

/**
 * Fetches the real, general user directory (`GET /usuarios`) through the
 * shared authenticated SGEB transport. Filtering happens server-side; the
 * full (unpaginated) result set for the given filters is returned as-is —
 * see `types/user.ts`'s `UsersFilterState` comment for why no client-side
 * pagination is layered on top.
 */
export async function fetchUsers(
  params: UsersListParams,
  signal?: AbortSignal,
): Promise<UserViewModel[]> {
  const envelope = await requestSgeb<UsuarioApiRecord[]>({
    url: '/usuarios',
    params: { ...params },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapUsuarioToUser)
}

/** Fetches one user (`GET /usuarios/{uuid_usuario}`) — capitán or admin only server-side. */
export async function fetchUser(
  uuidUsuario: string,
  signal?: AbortSignal,
): Promise<UserViewModel> {
  const envelope = await requestSgeb<UsuarioApiRecord>({
    url: `/usuarios/${uuidUsuario}`,
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — guarded defensively
    // rather than assumed, same convention as `features/account/services/usuariosApi.ts`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapUsuarioToUser(envelope.data)
}

/**
 * `PUT /usuarios/{uuid_usuario}` — updates another user's profile fields
 * (capitán or admin only server-side). Exact field set confirmed against
 * `actualizarUsuarioValidator`; never sends `correo`/role/`activo` — see
 * `types/user.ts`'s `UpdateUserRequest` comment.
 */
export async function updateUser(
  uuidUsuario: string,
  request: UpdateUserRequest,
): Promise<UserViewModel> {
  const envelope = await requestSgeb<UsuarioApiRecord>({
    url: `/usuarios/${uuidUsuario}`,
    method: 'PUT',
    data: request,
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapUsuarioToUser(envelope.data)
}

/**
 * `PATCH /usuarios/{uuid_usuario}` `{activo}` — activates/deactivates
 * another user's account (`estadoUsuarioValidator`,
 * `UsuarioService.cambiarEstado`). Rejects with `SGEB-4022` if the caller
 * targets their own account — surfaced as an ordinary `SgebApplicationError`,
 * not special-cased here; the caller already disables this action against
 * the session's own uuid (see `UserDetailDialog`) so this is a defense-in-
 * depth backend rule, not the primary UX guard.
 */
export async function setUserActive(
  uuidUsuario: string,
  activo: boolean,
): Promise<UserViewModel> {
  const envelope = await requestSgeb<UsuarioApiRecord>({
    url: `/usuarios/${uuidUsuario}`,
    method: 'PATCH',
    data: { activo },
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapUsuarioToUser(envelope.data)
}
