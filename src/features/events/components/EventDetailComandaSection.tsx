import { IconFileText } from '@tabler/icons-react'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { isSafeComandaUrl } from '@/features/events/utils/comandaUrlSafety'
import { Button, Text } from '@/shared/components'

export interface EventDetailComandaSectionProps {
  evento: EventDetailViewModel
}

/**
 * Display/open only — no upload, no edit, no generated file, no
 * iframe/PDF viewer. `isSafeComandaUrl` re-validates the value at render
 * time (never trusts the model's typing alone) so a malformed or
 * non-`http(s)` value can never reach an `href`. Opens in a new tab with
 * `rel="noopener noreferrer"` (never a bare `target="_blank"`) — the
 * comanda-upload origin/path itself remains a known, separate contract
 * gap (docs/FrontendArchitecture.md §7.5), not something this branch
 * resolves.
 */
export function EventDetailComandaSection({ evento }: EventDetailComandaSectionProps) {
  const hasComanda = isSafeComandaUrl(evento.comandaUrl)

  return (
    <EventDetailSection title="Comanda">
      {hasComanda ? (
        <Button asChild variant="outline">
          <a href={evento.comandaUrl} target="_blank" rel="noopener noreferrer">
            <IconFileText aria-hidden="true" />
            Abrir comanda
          </a>
        </Button>
      ) : (
        <Text size="sm" className="text-muted-foreground">
          No hay una comanda disponible para este evento.
        </Text>
      )}
    </EventDetailSection>
  )
}
