import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import {
  createMesaFormSchema,
  type CreateMesaFormValues,
} from '@/features/events/schemas/mesaCreateSchema'
import type { MesaViewModel } from '@/features/events/services/mesasApi'
import {
  Alert,
  Badge,
  Button,
  FormField,
  Input,
  Spinner,
  Text,
} from '@/shared/components'

export interface EventDetailMesasSectionProps {
  mesas: readonly MesaViewModel[]
  isLoading: boolean
  /** A real list-read failure (never "no mesas yet" — that is an empty array). */
  errorMessage?: string
  /**
   * `Evento.numMesas` — a planning/capacity figure, independent of how many
   * real `Mesa` rows exist (confirmed against the pinned backend:
   * `agregarMesa` never checks it, and publishing only requires at least
   * one real `Mesa`, not a count match — see `mesasApi.ts`'s own comment).
   * Drives the "X registradas de Y planeadas" summary below; omitted
   * entirely (no summary rendered) while the event itself hasn't loaded.
   */
  numMesasPlaneadas?: number
  /**
   * UX-only visibility gate for the "Agregar mesa" form — never a security
   * boundary. `POST /eventos/{id}/mesas` is `capitan`/`admin`-only
   * server-side; hiding the form for any other role is a genuine UX
   * improvement, not a compensating control.
   */
  canManage: boolean
  onCreateMesa: (values: CreateMesaFormValues) => Promise<void>
  isCreating: boolean
  /** A safe, user-facing message for the most recent failed creation attempt — never `technical_message`. */
  createErrorMessage?: string
}

const MESA_ESTADO_LABELS: Record<MesaViewModel['estado'], string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
}

/**
 * The minimum Mesa management this branch implements: list the event's
 * real mesas and create new ones — exactly the `borrador → publicado`
 * prerequisite the pinned backend enforces (`SGEB-4013`, "publicar exige
 * al menos una mesa"), not the full Mesa-management surface (no edit, no
 * delete, no QR regeneration — see `mesasApi.ts`'s own comment for why
 * those stay out of scope). AsignacionMesa (participant-to-table
 * assignment, a Montage concern) is a completely separate model/route,
 * never touched here.
 *
 * `codigoQr` is deliberately never rendered as a scannable QR image or
 * copyable link in this section — this branch has no confirmed, approved
 * design for surfacing it (printing, display, distribution), and
 * fabricating one would be guessing at an unapproved flow, the same
 * reasoning `EventCreateForm` already applies to `uuid_capitan`.
 *
 * No `nfc_uid` field in the "Agregar mesa" form: confirmed reserved/unused
 * (`openapi-sgeb.yaml` v1.12.0's `Mesa.nfc_uid` description — "ningún flujo
 * la usa: la vinculación se hace por QR"). QR (`codigoQr`, server-generated)
 * is the only live linking mechanism.
 */
export function EventDetailMesasSection({
  mesas,
  isLoading,
  errorMessage,
  numMesasPlaneadas,
  canManage,
  onCreateMesa,
  isCreating,
  createErrorMessage,
}: EventDetailMesasSectionProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMesaFormValues>({
    resolver: zodResolver(createMesaFormSchema),
    defaultValues: { etiqueta: '' },
  })

  async function submit(values: CreateMesaFormValues) {
    try {
      await onCreateMesa(values)
    } catch {
      // The caller's own error UI (`createErrorMessage` below, sourced
      // from the mutation's error state) already surfaces what went
      // wrong — this form just leaves the fields as the user left them.
      return
    }
    reset({ etiqueta: '' })
  }

  return (
    <EventDetailSection title="Mesas">
      <div className="flex flex-col gap-4">
        {!isLoading && !errorMessage && numMesasPlaneadas !== undefined ? (
          <Text size="sm" className="text-muted-foreground">
            {mesas.length} registrada{mesas.length === 1 ? '' : 's'} de{' '}
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
          </Alert>
        ) : mesas.length === 0 ? (
          <Text size="sm" className="text-muted-foreground">
            Este evento aún no tiene mesas registradas.
          </Text>
        ) : (
          <ul aria-label="Mesas del evento" className="flex flex-col gap-2">
            {mesas.map((mesa) => (
              <li
                key={mesa.idMesa}
                className="border-border flex items-center justify-between rounded-lg border p-3"
              >
                <Text size="sm" className="font-medium">
                  {mesa.etiqueta}
                </Text>
                <Badge tone={mesa.estado === 'libre' ? 'neutral' : 'info'}>
                  {MESA_ESTADO_LABELS[mesa.estado]}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form
            noValidate
            onSubmit={(event) => void handleSubmit(submit)(event)}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <FormField label="Etiqueta" required error={errors.etiqueta?.message}>
              {(controlProps) => (
                <Input
                  {...controlProps}
                  maxLength={20}
                  disabled={isCreating}
                  {...register('etiqueta')}
                />
              )}
            </FormField>
            <Button type="submit" size="sm" loading={isCreating} className="w-fit">
              Agregar mesa
            </Button>
          </form>
        ) : null}

        {canManage && createErrorMessage ? (
          <Alert tone="danger" title="No se pudo agregar la mesa">
            <p>{createErrorMessage}</p>
          </Alert>
        ) : null}
      </div>
    </EventDetailSection>
  )
}
