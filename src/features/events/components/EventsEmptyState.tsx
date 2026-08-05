import { IconCalendarEvent } from '@tabler/icons-react'

import { Button, Text } from '@/shared/components'

export interface EventsEmptyStateProps {
  onCreate?: (() => void) | undefined
}

export function EventsEmptyState({ onCreate }: EventsEmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <IconCalendarEvent aria-hidden="true" className="text-muted-foreground size-10" />
      <Text size="sm" className="text-muted-foreground">
        No hay eventos que coincidan con los filtros actuales.
      </Text>
      {onCreate ? (
        <Button type="button" onClick={onCreate}>
          Crear el primer evento
        </Button>
      ) : null}
    </div>
  )
}
