import type { Tone } from '@/shared/components'
import type { DashboardEventStatus } from '@/features/dashboard/types/dashboard'

/**
 * Presentational label + tone for each documented `estado` value. A
 * display decision this feature owns — the tone alone never carries
 * the meaning; the text label is always rendered too.
 */
export const DASHBOARD_EVENT_STATUS_LABELS: Record<DashboardEventStatus, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export const DASHBOARD_EVENT_STATUS_TONES: Record<DashboardEventStatus, Tone> = {
  borrador: 'neutral',
  publicado: 'info',
  en_curso: 'success',
  finalizado: 'neutral',
  cancelado: 'danger',
}
