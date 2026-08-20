import { requestSgeb } from '@/shared/api/sgebClient'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

/**
 * Wire shape of one row in `GET /usuarios` — confirmed against `Usuario`'s
 * own `@column` declarations (`app/modules/identidad/models/usuario.ts`).
 * `UsuarioService.listar` always `.preload('rol')`, but this feature never
 * needs it (every row here is already scoped to `rol=mesero`), so it's
 * omitted here rather than declared and ignored.
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

/**
 * `GET /usuarios` query parameters this call actually sends — confirmed
 * against `filtrosUsuarioValidator`
 * (`app/modules/identidad/validators/usuario_validator.ts`). `rol` is
 * always `'mesero'` here (this feature is the waiters directory, not a
 * general user directory); `activo`/`q` mirror `WaitersFilterState`
 * exactly.
 */
export interface WaitersListParams {
  activo?: boolean
  q?: string
}

function mapUsuarioToWaiter(record: UsuarioApiRecord): WaiterListItemViewModel {
  const apellidos = [record.apellido_paterno, record.apellido_materno]
    .filter((value): value is string => Boolean(value))
    .join(' ')
  return {
    id: record.uuid_usuario,
    nombreCompleto: `${record.nombre} ${apellidos}`.trim(),
    correo: record.correo,
    telefono: record.telefono,
    estadoCuenta: record.activo ? 'activo' : 'inactivo',
  }
}

/**
 * Fetches the real waiters directory (`GET /usuarios?rol=mesero`) through
 * the shared authenticated SGEB transport. Filtering happens server-side —
 * `activo`/`q` are real, documented query parameters
 * (`filtrosUsuarioValidator`), not an in-memory post-filter.
 */
export async function fetchWaiters(
  params: WaitersListParams,
  signal?: AbortSignal,
): Promise<WaiterListItemViewModel[]> {
  const envelope = await requestSgeb<UsuarioApiRecord[]>({
    url: '/usuarios',
    params: { rol: 'mesero', ...params },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapUsuarioToWaiter)
}
