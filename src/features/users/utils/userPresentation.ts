import type { Tone } from '@/shared/components'
import type { UserAccountStatus, UserRoleName } from '@/features/users/types/user'

/**
 * Presentational label + tone for each documented account status. A
 * display decision this feature owns, not a business rule — the tone alone
 * never carries the meaning, `UserStatusBadge` always also renders the text
 * label. Mirrors `features/waiters/utils/waiterStatusPresentation.ts` — kept
 * as a separate small copy rather than a shared import, same "independent
 * consumers of the same server model" convention documented throughout this
 * codebase (see `services/usersApi.ts`).
 */
export const USER_ACCOUNT_STATUS_LABELS: Record<UserAccountStatus, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
}

export const USER_ACCOUNT_STATUS_TONES: Record<UserAccountStatus, Tone> = {
  activo: 'success',
  inactivo: 'neutral',
}

/** Same three role values `AccountMenu`/`ProfilePage` already label locally — duplicated here per this codebase's established convention rather than promoted to a shared constant. */
export const USER_ROLE_LABELS: Record<UserRoleName, string> = {
  admin: 'Administrador',
  capitan: 'Capitán',
  mesero: 'Mesero',
}
