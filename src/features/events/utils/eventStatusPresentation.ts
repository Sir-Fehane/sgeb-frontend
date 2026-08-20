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

/**
 * Success-toast title for a completed `PATCH /eventos/{id}/estado`
 * transition, keyed by the TARGET `estado` (the value just reached, not
 * the one left behind) — deliberately its own map, not derived from
 * `EVENT_STATUS_LABELS`: this is action-completed phrasing ("Evento
 * iniciado"), not the noun-form badge label ("En curso"). Shared by every
 * caller of `useChangeEventoEstadoMutation`
 * (`EventDetailPage`'s publish/start/return-to-draft/cancel actions,
 * `EventClosurePage`'s finalize) so the copy is defined exactly once,
 * never duplicated per page.
 */
export const EVENT_STATUS_TRANSITION_TOAST_TITLES: Record<EventStatus, string> = {
  borrador: 'Evento devuelto a borrador',
  publicado: 'Evento publicado',
  en_curso: 'Evento iniciado',
  finalizado: 'Evento finalizado',
  cancelado: 'Evento cancelado',
}
