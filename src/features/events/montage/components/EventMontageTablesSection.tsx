import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventTableViewModel } from '@/features/events/montage/types/montage'
import {
  MESA_ESTADO_LABELS,
  MESA_ESTADO_TONES,
} from '@/features/events/montage/utils/montagePresentation'
import { Alert, Badge, Button, Spinner, Text } from '@/shared/components'

export interface EventMontageTablesSectionProps {
  tables: readonly EventTableViewModel[]
  isLoading?: boolean
  /** A real `GET /eventos/{id}/mesas` or `GET /eventos/{id}/asignaciones` read failure — never "no tables yet," that's an empty array. */
  errorMessage?: string
  onRetry?: (() => void) | undefined
  /** `Evento.numMesas` — a planning figure, independent of how many real `Mesa` rows exist (`agregarMesa` never checks it; publishing only requires ≥1 real `Mesa`, not a count match). Drives the "X registradas de Y planeadas" line below — informational only, never blocking, even when `tables.length` exceeds it. */
  numMesasPlaneadas?: number
}

/**
 * Read-only overview of every table's current status, resolved occupant
 * (waiter name) and `vinculada` state. Never shows `codigo_qr`, and never
 * offers a "vincular" action — that transition is confirmed `mesero`-role
 * (QR-scan device) only at the route-middleware level; see
 * `types/montage.ts`'s module comment.
 */
export function EventMontageTablesSection({
  tables,
  isLoading = false,
  errorMessage,
  onRetry,
  numMesasPlaneadas,
}: EventMontageTablesSectionProps) {
  return (
    <EventDetailSection title="Disponibilidad de mesas">
      <div className="flex flex-col gap-3">
        {!isLoading && !errorMessage && numMesasPlaneadas !== undefined ? (
          <Text size="sm" className="text-muted-foreground">
            {tables.length} registrada{tables.length === 1 ? '' : 's'} de{' '}
            {numMesasPlaneadas} planeada{numMesasPlaneadas === 1 ? '' : 's'}
          </Text>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" label="Cargando mesas" />
            <Text size="sm" className="text-muted-foreground">
              Cargando mesas…
            </Text>
          </div>
        ) : errorMessage ? (
          <Alert tone="danger" title="No pudimos cargar las mesas">
            <p>{errorMessage}</p>
            {onRetry ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onRetry}
              >
                Reintentar
              </Button>
            ) : null}
          </Alert>
        ) : tables.length === 0 ? (
          <Text size="sm" className="text-muted-foreground">
            Este evento aún no tiene mesas registradas.
          </Text>
        ) : (
          <ul aria-label="Mesas del evento" className="flex flex-wrap gap-2">
            {tables.map((mesa) => (
              <li
                key={mesa.idMesa}
                className="border-border bg-card flex flex-col gap-1 rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-sans text-body-sm font-medium">
                    {mesa.etiqueta}
                  </span>
                  <Badge tone={MESA_ESTADO_TONES[mesa.estado]}>
                    {MESA_ESTADO_LABELS[mesa.estado]}
                  </Badge>
                </div>
                {mesa.currentAssignment ? (
                  <div className="flex items-center gap-2">
                    <Text size="sm" className="text-muted-foreground">
                      {mesa.currentAssignment.nombreMesero}
                    </Text>
                    <Badge
                      tone={mesa.currentAssignment.vinculada ? 'success' : 'neutral'}
                    >
                      {mesa.currentAssignment.vinculada
                        ? 'Vinculada'
                        : 'Pendiente de vincular'}
                    </Badge>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </EventDetailSection>
  )
}
