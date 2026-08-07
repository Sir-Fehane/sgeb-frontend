import { IconCalendarOff } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Text } from '@/shared/components'

/**
 * Renders for a malformed/unknown route `:id` or a fixture lookup miss —
 * a normal, final outcome, never a raw route-parsing error or a stack
 * trace. Always offers a real link back to `/eventos`, never an
 * automatic redirect (a malformed id must not silently jump to another
 * event).
 */
export function EventDetailUnavailableState() {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <IconCalendarOff aria-hidden="true" className="text-muted-foreground size-10" />
      <Text size="sm" className="text-muted-foreground">
        No encontramos el evento solicitado.
      </Text>
      <Button asChild variant="outline">
        <Link to="/eventos">Volver a eventos</Link>
      </Button>
    </div>
  )
}
