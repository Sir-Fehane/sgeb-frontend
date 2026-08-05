import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
  createEventFormSchema,
  type EventCreateFieldPrototypeValues,
} from '@/features/events/schemas/eventCreateSchema'
import type { EventSalonOption } from '@/features/events/types/event'
import {
  Alert,
  Button,
  FormField,
  Input,
  SectionHeading,
  Select,
  Text,
} from '@/shared/components'

export interface EventCreateFormProps {
  onSubmit: (values: EventCreateFieldPrototypeValues) => void
  isSubmitting?: boolean
  /** Dev fixtures on this branch — see features/events/fixtures. */
  salones: readonly EventSalonOption[]
}

/**
 * A field-validation prototype for a subset of `EventoCrear`, NOT the
 * approved event-creation workflow. The wireframe names the real flow
 * "Crear evento (5-step wizard)", but its exact step boundaries could
 * not be verified this session (no image rendering available for
 * docs/design/Diseño Web.pdf) — rather than invent step names/order,
 * every validated field is presented in one page purely to exercise the
 * validation rules. This is not a layout the user should expect to ship
 * as-is; see `EventCreateFieldPrototypePage` for the prototype framing.
 *
 * `uuid_capitan` and `comanda_url` are intentionally absent — both are
 * integration-owned fields; see `eventCreateSchema.ts`'s comment for why.
 */
export function EventCreateForm({
  onSubmit,
  isSubmitting = false,
  salones,
}: EventCreateFormProps) {
  const schema = useMemo(() => createEventFormSchema(salones), [salones])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventCreateFieldPrototypeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '',
      fecha: '',
      hora_presentacion: '',
      inicio: '',
    },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
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
          La asignación de capitán se definirá al integrar autenticación y permisos.
        </Text>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Comanda</SectionHeading>
        <Alert tone="warning">
          Carga de comanda pendiente de definición del endpoint.
        </Alert>
      </section>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Validar borrador
      </Button>
    </form>
  )
}
