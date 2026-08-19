import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { EventGeofenceRadiusField } from '@/features/events/components/EventGeofenceRadiusField'
import {
  editEventFormSchema,
  type EventEditFormValues,
} from '@/features/events/schemas/eventEditSchema'
import type { EventDetailViewModel } from '@/features/events/types/event'
import {
  Alert,
  Button,
  FormField,
  Input,
  SectionHeading,
  Select,
} from '@/shared/components'

export interface EventEditFormProps {
  evento: EventDetailViewModel
  /**
   * May reject (e.g. a business-rule error from the real `PUT /eventos/{id}`)
   * — this form's own `submit` wrapper catches that and leaves the fields
   * as the user left them, mirroring `EventCreateForm`'s established
   * `onSubmit` contract.
   */
  onSubmit: (values: EventEditFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  /** A safe, user-facing message for the most recent failed update attempt — never `technical_message`. */
  errorMessage?: string
}

/**
 * The real `PUT /eventos/{id}` field set (see `eventEditSchema.ts`) —
 * deliberately narrower than `EventCreateForm`: no salón/fecha/hora de
 * presentación/inicio, none of which the pinned backend's
 * `actualizarEventoValidator` accepts. `radioGeocercaM` is disabled outside
 * `borrador` — a real backend restriction
 * (`EventoService.actualizar` rejects the whole request with `SGEB-4013`
 * if this key is present at all outside `borrador`, even unchanged), not a
 * cosmetic choice; `EventDetailEditSection`'s caller
 * (`useUpdateEventoMutation`'s wiring in `EventDetailPage`) omits this key
 * from the outgoing request outside `borrador` to match.
 */
export function EventEditForm({
  evento,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
}: EventEditFormProps) {
  const canEditRadioGeocerca = evento.estado === 'borrador'

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventEditFormValues>({
    resolver: zodResolver(editEventFormSchema),
    defaultValues: {
      titulo: evento.titulo,
      tipo: evento.tipo,
      cupo_meseros: evento.cupoMeseros,
      num_mesas: evento.numMesas,
      tarifa_por_mesero: evento.tarifaPorMesero,
      radio_geocerca_m: evento.radioGeocercaM,
    },
  })

  async function submit(values: EventEditFormValues) {
    try {
      await onSubmit(values)
    } catch {
      // The caller's own error UI (`errorMessage` below, sourced from the
      // mutation's error state) already surfaces what went wrong — this
      // form just leaves the fields exactly as the user left them.
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-4"
    >
      {errorMessage ? (
        <Alert tone="danger" title="No se pudo actualizar el evento">
          <p>{errorMessage}</p>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-4">
        <SectionHeading>Información general</SectionHeading>
        <FormField label="Título" required error={errors.titulo?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              maxLength={120}
              disabled={isSubmitting}
              {...register('titulo')}
            />
          )}
        </FormField>
        <FormField label="Tipo de evento" required error={errors.tipo?.message}>
          {(controlProps) => (
            <Select {...controlProps} disabled={isSubmitting} {...register('tipo')}>
              <option value="social">Social</option>
              <option value="empresarial">Empresarial</option>
            </Select>
          )}
        </FormField>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Operación</SectionHeading>
        <FormField label="Cupo de meseros" required error={errors.cupo_meseros?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              disabled={isSubmitting}
              {...register('cupo_meseros', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <FormField label="Número de mesas" required error={errors.num_mesas?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              disabled={isSubmitting}
              {...register('num_mesas', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <FormField
          label="Tarifa por mesero (MXN)"
          required
          error={errors.tarifa_por_mesero?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              step="0.01"
              disabled={isSubmitting}
              {...register('tarifa_por_mesero', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <EventGeofenceRadiusField
          value={watch('radio_geocerca_m')}
          disabled={isSubmitting || !canEditRadioGeocerca}
          error={errors.radio_geocerca_m?.message}
          extraDescription={
            canEditRadioGeocerca
              ? undefined
              : 'Solo editable mientras el evento está en borrador — cambiarlo después invalidaría asistencias ya confirmadas.'
          }
          registration={register('radio_geocerca_m', { valueAsNumber: true })}
        />
      </section>

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          Guardar cambios
        </Button>
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
