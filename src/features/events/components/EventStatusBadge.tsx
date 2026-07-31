import { Badge } from '@/shared/components'
import type { EventStatus } from '@/features/events/types/event'
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_TONES,
} from '@/features/events/utils/eventStatusPresentation'

export interface EventStatusBadgeProps {
  estado: EventStatus
}

/**
 * Renders the exact documented `estado` value as its Spanish label. The
 * tone (see `eventStatusPresentation.ts`) is a secondary reinforcement —
 * the text label is always present, so status is never color-only.
 */
export function EventStatusBadge({ estado }: EventStatusBadgeProps) {
  return <Badge tone={EVENT_STATUS_TONES[estado]}>{EVENT_STATUS_LABELS[estado]}</Badge>
}
