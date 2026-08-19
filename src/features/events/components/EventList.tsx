import { EventListItem } from '@/features/events/components/EventListItem'
import type { EventListItemViewModel } from '@/features/events/types/event'

export interface EventListProps {
  eventos: readonly EventListItemViewModel[]
}

export function EventList({ eventos }: EventListProps) {
  return (
    <ul aria-label="Eventos" className="flex flex-col gap-3">
      {eventos.map((evento) => (
        <EventListItem key={evento.idEvento} evento={evento} />
      ))}
    </ul>
  )
}
