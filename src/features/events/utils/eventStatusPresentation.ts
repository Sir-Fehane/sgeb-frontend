import type { Tone } from '@/shared/components'
import type { EventStatus } from '@/features/events/types/event'

/**
 * Presentational label + tone for each documented `estado` value. This
 * is a display decision this feature owns (per
 * docs/FrontendArchitecture.md §11: "do that mapping inside the feature
 * that owns the status"), not a business rule — the tone alone never
 * carries the meaning; `EventStatusBadge` always also renders the text
 * label.
 */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export const EVENT_STATUS_TONES: Record<EventStatus, Tone> = {
  borrador: 'neutral',
  publicado: 'info',
  en_curso: 'success',
  finalizado: 'neutral',
  cancelado: 'danger',
}
