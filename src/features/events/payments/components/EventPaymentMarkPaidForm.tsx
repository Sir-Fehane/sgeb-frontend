import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  markPaidSchema,
  type MarkPaidFormValues,
} from '@/features/events/payments/schemas/markPaidSchema'
import { Button, FormField, Input, Text } from '@/shared/components'

export interface EventPaymentMarkPaidFormProps {
  onSubmit: (values: MarkPaidFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

/**
 * Maps exactly to `PATCH /pagos/{id_pago}/pagado` — records a manual
 * transfer that ALREADY happened outside SGEB; it never executes one.
 * The explanatory text says so explicitly so this is never mistaken for
 * a "send money" action. `referencia` is normalized to uppercase by
 * `markPaidSchema` itself (mirroring the documented API normalization),
 * not by this component.
 */
export function EventPaymentMarkPaidForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EventPaymentMarkPaidFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: { referencia: '' },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-3"
    >
      <Text size="sm" className="text-muted-foreground">
        Confirma que la transferencia ya se realizó manualmente e ingresa su referencia
        bancaria.
      </Text>

      <FormField label="Referencia bancaria" required error={errors.referencia?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={40}
            disabled={isSubmitting}
            {...register('referencia')}
          />
        )}
      </FormField>

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting} size="sm">
          Registrar transferencia
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
