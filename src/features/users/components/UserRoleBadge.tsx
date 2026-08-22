import { Badge } from '@/shared/components'
import type { UserRoleViewModel } from '@/features/users/types/user'
import { USER_ROLE_LABELS } from '@/features/users/utils/userPresentation'

export interface UserRoleBadgeProps {
  rol: UserRoleViewModel | null
}

/**
 * Renders the user's fixed role (`Rol.nombre`, immutable — see
 * `types/user.ts`'s module comment) as its Spanish label. `rol: null` is a
 * defensive, never-observed-in-practice case (see `services/usersApi.ts`'s
 * `UsuarioApiRecord` comment) — rendered as a neutral "Sin rol" rather than
 * throwing or leaving a blank cell.
 */
export function UserRoleBadge({ rol }: UserRoleBadgeProps) {
  if (!rol) {
    return <Badge tone="neutral">Sin rol</Badge>
  }
  return <Badge tone="info">{USER_ROLE_LABELS[rol.nombre]}</Badge>
}
