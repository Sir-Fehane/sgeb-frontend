import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of `GET`/`PUT /usuarios/me` (`Usuario` schema) — the same
 * `@column` fields `features/waiters/services/waitersApi.ts`'s own
 * `UsuarioApiRecord` documents for `GET /usuarios`, confirmed against the
 * pinned backend's `app/modules/identidad/models/usuario.ts`. Declared
 * locally rather than imported from that feature: Waiters and Account are
 * independent consumers of the same server model, not a shared
 * abstraction — same "one shared transport DTO boundary plus
 * feature-specific mapping" reasoning `asignacionesApi.ts`'s own comment
 * documents.
 */
export interface UsuarioApiRecord {
  uuid_usuario: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  correo: string
  telefono: string | null
  activo: boolean
}

export interface MiPerfilViewModel {
  uuidUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  correo: string
  telefono: string | null
  activo: boolean
}

function mapUsuarioToMiPerfil(record: UsuarioApiRecord): MiPerfilViewModel {
  return {
    uuidUsuario: record.uuid_usuario,
    nombre: record.nombre,
    apellidoPaterno: record.apellido_paterno,
    apellidoMaterno: record.apellido_materno,
    correo: record.correo,
    telefono: record.telefono,
    activo: record.activo,
  }
}

/**
 * Fetches the authenticated user's own profile through
 * `GET /usuarios/me`. Confirmed live on the pinned v1.13 backend — the
 * route now sits ahead of `/usuarios/:uuid_usuario` so `me` is never parsed
 * as a UUID, the previous routing gap that made this 404. The subject is
 * resolved server-side from the JWT `sub` claim; this function never sends
 * an identifier.
 */
export async function fetchMiPerfil(signal?: AbortSignal): Promise<MiPerfilViewModel> {
  const envelope = await requestSgeb<UsuarioApiRecord>({
    url: '/usuarios/me',
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful profile
    // read always returns the Usuario record — guarded defensively rather
    // than assumed, same as `eventsApi.ts`'s `fetchEventoDetalle`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapUsuarioToMiPerfil(envelope.data)
}

/**
 * `PUT /usuarios/me` request body — exact field set confirmed against the
 * pinned backend's `actualizarUsuarioValidator`
 * (`app/modules/identidad/validators/usuario_validator.ts`), all optional.
 * `correo`, role, and account-active status are deliberately absent: not
 * editable by the subject themselves (attempting it returns `SGEB-1004`) —
 * those belong to the separate capitán/admin-only
 * `PATCH /usuarios/{uuid_usuario}`, out of this endpoint's contract.
 */
export interface UpdateMiPerfilRequest {
  nombre?: string
  apellidoPaterno?: string
  apellidoMaterno?: string | null
  telefono?: string | null
}

/** Updates the authenticated user's own profile through `PUT /usuarios/me`. */
export async function updateMiPerfil(
  request: UpdateMiPerfilRequest,
): Promise<MiPerfilViewModel> {
  const envelope = await requestSgeb<UsuarioApiRecord>({
    url: '/usuarios/me',
    method: 'PUT',
    data: request,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — guarded defensively
    // rather than assumed, same as `fetchMiPerfil`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapUsuarioToMiPerfil(envelope.data)
}
