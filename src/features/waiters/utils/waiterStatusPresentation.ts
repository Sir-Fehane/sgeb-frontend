import type { Tone } from '@/shared/components'
import type { WaiterAccountStatus } from '@/features/waiters/types/waiter'

/**
 * Presentational label + tone for each documented account status. A
 * display decision this feature owns (docs/FrontendArchitecture.md
 * §11), not a business rule — the tone alone never carries the
 * meaning; `WaiterStatusBadge` always also renders the text label.
 */
export const WAITER_ACCOUNT_STATUS_LABELS: Record<WaiterAccountStatus, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
}

export const WAITER_ACCOUNT_STATUS_TONES: Record<WaiterAccountStatus, Tone> = {
  activo: 'success',
  inactivo: 'neutral',
}
