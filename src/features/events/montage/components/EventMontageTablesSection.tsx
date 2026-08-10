import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventTableViewModel } from '@/features/events/montage/types/montage'
import {
  MESA_ESTADO_LABELS,
  MESA_ESTADO_TONES,
} from '@/features/events/montage/utils/montagePresentation'
import { Badge, Text } from '@/shared/components'

export interface EventMontageTablesSectionProps {
  tables: readonly EventTableViewModel[]
}

/**
 * Read-only overview of every table's current status — `libre | ocupada`,
 * the only two documented values (`GET /eventos/{id_evento}/mesas`). Never
 * shows `codigo_qr`/`token_comensal`, and never offers a QR-regeneration
 * action (out of scope, mesero/comensal-facing, unrelated to montaje).
 */
export function EventMontageTablesSection({ tables }: EventMontageTablesSectionProps) {
  if (tables.length === 0) {
    return (
      <EventDetailSection title="Disponibilidad de mesas">
        <Text size="sm" className="text-muted-foreground">
          Este evento aún no tiene mesas registradas.
        </Text>
      </EventDetailSection>
    )
  }

  return (
    <EventDetailSection title="Disponibilidad de mesas">
      <ul aria-label="Mesas del evento" className="flex flex-wrap gap-2">
        {tables.map((mesa) => (
          <li
            key={mesa.idMesa}
            className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2"
          >
            <span className="font-sans text-body-sm font-medium">{mesa.etiqueta}</span>
            <Badge tone={MESA_ESTADO_TONES[mesa.estado]}>
              {MESA_ESTADO_LABELS[mesa.estado]}
            </Badge>
          </li>
        ))}
      </ul>
    </EventDetailSection>
  )
}
