import { requestSgeb } from '@/shared/api/sgebClient'
import type { RoleViewModel } from '@/features/waiters/types/role'

/** Wire shape of one row in `GET /roles` — `Rol` model (`app/modules/identidad/models/rol.ts`). */
export interface RolApiRecord {
  id_rol: number
  nombre: 'admin' | 'capitan' | 'mesero'
  descripcion: string | null
  activo: boolean
}

/**
 * Fetches the real, fixed role catalog (`GET /roles`) through the shared
 * authenticated SGEB transport — used only to resolve `mesero`'s real
 * `id_rol` for the invite flow, never a hardcoded id (`UsuarioService.listarRoles`
 * seeds it, but never guarantees a specific value the frontend should
 * assume).
 */
export async function fetchRoles(signal?: AbortSignal): Promise<RoleViewModel[]> {
  const envelope = await requestSgeb<RolApiRecord[]>({
    url: '/roles',
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map((record) => ({
    idRol: record.id_rol,
    nombre: record.nombre,
  }))
}
