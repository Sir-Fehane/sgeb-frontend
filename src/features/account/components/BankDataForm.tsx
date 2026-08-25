import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  datosBancariosSchema,
  type DatosBancariosFormValues,
} from '@/features/account/schemas/datosBancariosSchema'
import { Button, FormField, Input } from '@/shared/components'

export interface BankDataFormProps {
  onSubmit: (values: DatosBancariosFormValues) => Promise<void>
  isSubmitting?: boolean
  submitLabel: string
}

/**
 * Registers or replaces the authenticated user's own bank data
 * (`POST /usuarios/me/datos-bancarios`). Always starts blank — the CLABE
 * masks server-side the moment it's saved (see `services/usuariosApi.ts`'s
 * `DatosBancariosApiRecord` comment), so there is no full value to
 * pre-fill even when replacing an existing record; the user re-enters all
 * three fields every time, matching a password-change form more than a
 * profile-edit form.
 */
export function BankDataForm({
  onSubmit,
  isSubmitting = false,
  submitLabel,
}: BankDataFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosBancariosFormValues>({
    resolver: zodResolver(datosBancariosSchema),
    defaultValues: { clabe: '', banco: '', titularCuenta: '' },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormField label="CLABE" required error={errors.clabe?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            inputMode="numeric"
            maxLength={18}
            autoComplete="off"
            disabled={isSubmitting}
            {...register('clabe')}
          />
        )}
      </FormField>

      <FormField label="Banco" required error={errors.banco?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={30}
            autoComplete="off"
            disabled={isSubmitting}
            {...register('banco')}
          />
        )}
      </FormField>

      <FormField
        label="Titular de la cuenta"
        required
        error={errors.titularCuenta?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={50}
            autoComplete="off"
            disabled={isSubmitting}
            {...register('titularCuenta')}
          />
        )}
      </FormField>

      <Button type="submit" loading={isSubmitting} className="w-fit">
        {submitLabel}
      </Button>
    </form>
  )
}
