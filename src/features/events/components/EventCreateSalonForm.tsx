import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { SalonLocationPicker } from '@/features/events/components/SalonLocationPicker'
import {
  createSalonFormSchema,
  type CreateSalonFormValues,
} from '@/features/events/schemas/salonCreateSchema'
import { Alert, Button, FormField, Input } from '@/shared/components'

export interface EventCreateSalonFormProps {
  /**
   * May reject (e.g. a business-rule error from the real `POST /salones`)
   * — this form's own `submit` wrapper catches that and leaves the fields
   * as the user left them, rather than resetting, so the caller's own
   * error UI (`EventCreatePage`'s mutation error state, threaded through
   * `errorMessage` below) stays the single source of truth for what went
   * wrong. Mirrors `EventCreateForm`'s/`EventClosureWasteForm`'s
   * established `onSubmit` contract.
   */
  onSubmit: (values: CreateSalonFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  /** A safe, user-facing message for the most recent failed creation attempt — never `technical_message`. */
  errorMessage?: string
}

/**
 * The event-creation flow's minimal "no encuentro mi salón" fallback —
 * `POST /salones`, exactly the fields the pinned backend's `salonValidator`
 * requires (see `schemas/salonCreateSchema.ts`), nothing more. Not a Salon
 * management screen: no edit, no deactivate, no listing beyond what
 * `EventCreateForm`'s own picker already shows.
 *
 * Rendered inside `EventCreateSalonDialog`'s own bordered/padded surface
 * — this form's root carries no border/padding of its own (unlike most
 * standalone forms in this feature) so it doesn't nest a second visible
 * box inside the dialog's.
 */
export function EventCreateSalonForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
}: EventCreateSalonFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSalonFormValues>({
    resolver: zodResolver(createSalonFormSchema),
  })

  async function submit(values: CreateSalonFormValues) {
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
        <Alert tone="danger" title="No se pudo crear el salón">
          <p>{errorMessage}</p>
        </Alert>
      ) : null}

      <FormField label="Nombre" required error={errors.nombre?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={80}
            autoComplete="off"
            disabled={isSubmitting}
            {...register('nombre')}
          />
        )}
      </FormField>
      <FormField label="Calle" required error={errors.calle?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={50}
            autoComplete="address-line1"
            disabled={isSubmitting}
            {...register('calle')}
          />
        )}
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Código postal" required error={errors.cp?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              disabled={isSubmitting}
              {...register('cp')}
            />
          )}
        </FormField>
        <FormField label="Colonia" required error={errors.colonia?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              maxLength={40}
              autoComplete="address-line2"
              disabled={isSubmitting}
              {...register('colonia')}
            />
          )}
        </FormField>
        <FormField label="Ciudad" required error={errors.ciudad?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              maxLength={40}
              autoComplete="address-level2"
              disabled={isSubmitting}
              {...register('ciudad')}
            />
          )}
        </FormField>
        <FormField label="Estado" required error={errors.estado?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              maxLength={25}
              autoComplete="address-level1"
              disabled={isSubmitting}
              {...register('estado')}
            />
          )}
        </FormField>
        <FormField
          label="Capacidad máxima de mesas"
          required
          error={errors.capacidadMaxMesas?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              numeric="integer"
              disabled={isSubmitting}
              {...register('capacidadMaxMesas', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <FormField
          label="Capacidad de personas"
          required
          error={errors.capacidadPersonas?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              numeric="integer"
              disabled={isSubmitting}
              {...register('capacidadPersonas', { valueAsNumber: true })}
            />
          )}
        </FormField>
      </div>

      <SalonLocationPicker control={control} disabled={isSubmitting} />

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isSubmitting}>
          Crear salón
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
