import { EventListItem } from '@/features/events/components/EventListItem'
import type { EventListItemViewModel } from '@/features/events/types/event'

export interface EventListProps {
  eventos: readonly EventListItemViewModel[]
  onSelectEvent?: ((id: string) => void) | undefined
}

export function EventList({ eventos, onSelectEvent }: EventListProps) {
  return (
    <ul aria-label="Eventos" className="flex flex-col gap-3">
      {eventos.map((evento) => (
        <EventListItem key={evento.idEvento} evento={evento} onSelect={onSelectEvent} />
      ))}
    </ul>
  )
}
