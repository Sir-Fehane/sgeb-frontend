import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  markFailedSchema,
  type MarkFailedFormValues,
} from '@/features/events/payments/schemas/markFailedSchema'
import { Button, FormField, Text, Textarea } from '@/shared/components'

export interface EventPaymentMarkFailedFormProps {
  onSubmit: (values: MarkFailedFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

/**
 * Maps exactly to `PATCH /pagos/{id_pago}/fallido` — records that a
 * manual transfer attempt was rejected; it never retries or contacts a
 * bank. `motivo` is submitted here but is never displayed again as a
 * persisted field once the payment becomes `fallido` — `Pago` documents
 * no read-side `motivo`/`motivo_fallo` field (see `types/payments.ts`).
 */
export function EventPaymentMarkFailedForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EventPaymentMarkFailedFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MarkFailedFormValues>({
    resolver: zodResolver(markFailedSchema),
    defaultValues: { motivo: '' },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-3"
    >
      <Text size="sm" className="text-muted-foreground">
        Registra por qué la transferencia manual no se completó. El pago podrá
        recalcularse la próxima vez que se ejecute el cálculo de pagos.
      </Text>

      <FormField label="Motivo" required error={errors.motivo?.message}>
        {(controlProps) => (
          <Textarea
            {...controlProps}
            maxLength={200}
            disabled={isSubmitting}
            {...register('motivo')}
          />
        )}
      </FormField>

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting} variant="outline" size="sm">
          Registrar transferencia rechazada
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
