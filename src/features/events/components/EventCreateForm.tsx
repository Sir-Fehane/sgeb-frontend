import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
  createEventFormSchema,
  type EventCreateFormValues,
} from '@/features/events/schemas/eventCreateSchema'
import type { EventSalonOption } from '@/features/events/types/event'
import {
  Button,
  FormField,
  Input,
  SectionHeading,
  Select,
  Text,
} from '@/shared/components'

export interface EventCreateFormProps {
  /**
   * May reject (e.g. a business-rule error from the real `POST /eventos`)
   * — this form's own `submit` wrapper catches that and leaves the fields
   * as the user left them, rather than resetting, so the caller's own
   * error UI (`EventCreatePage`'s mutation error state) stays the single
   * source of truth for what went wrong. Mirrors
   * `EventClosureWasteForm`'s established `onSubmit` contract.
   */
  onSubmit: (values: EventCreateFormValues) => Promise<void>
  isSubmitting?: boolean
  /** Live `GET /salones?activo=true` options — see `EventCreatePage`. */
  salones: readonly EventSalonOption[]
  /**
   * Auto-selects this salón id once it becomes available — used only by
   * `EventCreatePage` to select the salón just created through
   * `EventCreateSalonForm`'s inline fallback, without the caller reaching
   * into this form's internal RHF state.
   */
  selectedSalonId?: number | undefined
}

/**
 * The real `POST /eventos` field set (see `eventCreateSchema.ts`), wired
 * by `EventCreatePage` to the live salón list and the create mutation.
 *
 * `uuid_capitan` is intentionally absent as a form field — it is resolved
 * from the authenticated session, not typed in; see
 * `eventCreateSchema.ts`'s comment. Comanda is absent for a settled
 * reason: the real contract never declares it at creation at all
 * (`docs/decisions.md` ADR-007; `openapi-sgeb.yaml`'s own `EventoCrear`
 * description) — it is uploaded afterward, from Event Detail
 * (`EventDetailComandaSection`), via a dedicated
 * `POST /eventos/{id}/comanda`.
 */
export function EventCreateForm({
  onSubmit,
  isSubmitting = false,
  salones,
  selectedSalonId,
}: EventCreateFormProps) {
  const schema = useMemo(() => createEventFormSchema(salones), [salones])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EventCreateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '',
      fecha: '',
      hora_presentacion: '',
      inicio: '',
    },
  })

  useEffect(() => {
    if (selectedSalonId !== undefined) {
      setValue('id_salon', selectedSalonId, { shouldValidate: true })
    }
  }, [selectedSalonId, setValue])

  async function submit(values: EventCreateFormValues) {
    try {
      await onSubmit(values)
    } catch {
      // The caller's own error UI (`EventCreatePage`'s mutation error
      // state) already surfaces what went wrong — this form just leaves
      // the fields exactly as the user left them, so they can fix and
      // resubmit rather than losing their input to a false reset.
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-4">
        <SectionHeading>Datos generales</SectionHeading>
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
              <option value="">Selecciona un tipo</option>
              <option value="social">Social</option>
              <option value="empresarial">Empresarial</option>
            </Select>
          )}
        </FormField>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Programación</SectionHeading>
        <FormField label="Fecha del evento" required error={errors.fecha?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="date"
              disabled={isSubmitting}
              {...register('fecha')}
            />
          )}
        </FormField>
        <FormField
          label="Hora de presentación del personal"
          required
          error={errors.hora_presentacion?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="time"
              disabled={isSubmitting}
              {...register('hora_presentacion')}
            />
          )}
        </FormField>
        <FormField label="Fecha y hora de inicio" required error={errors.inicio?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="datetime-local"
              disabled={isSubmitting}
              {...register('inicio')}
            />
          )}
        </FormField>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Salón y capacidad</SectionHeading>
        <FormField label="Salón" required error={errors.id_salon?.message}>
          {(controlProps) => (
            <Select
              {...controlProps}
              disabled={isSubmitting}
              {...register('id_salon', { valueAsNumber: true })}
            >
              <option value="">Selecciona un salón</option>
              {salones.map((salon) => (
                <option key={salon.idSalon} value={salon.idSalon}>
                  {salon.nombre} (máx. {salon.capacidadMaxMesas} mesas)
                </option>
              ))}
            </Select>
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
        <FormField
          label="Radio de geocerca (metros)"
          required
          error={errors.radio_geocerca_m?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              disabled={isSubmitting}
              {...register('radio_geocerca_m', { valueAsNumber: true })}
            />
          )}
        </FormField>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Tarifa</SectionHeading>
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
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Capitán responsable</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          Este evento quedará a tu nombre, a partir de tu sesión iniciada.
        </Text>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Comanda</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          La comanda se sube después de crear el evento, desde su detalle — no forma parte
          de este alta.
        </Text>
      </section>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Crear evento
      </Button>
    </form>
  )
}
