import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'

import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { PasswordRequirementsList } from '@/features/auth/components/PasswordRequirementsList'
import {
  newPasswordSchema,
  type NewPasswordFormValues,
} from '@/features/auth/schemas/newPasswordSchema'
import type { AuthServerFeedback } from '@/features/auth/types/auth'
import { Alert, Button, FormField } from '@/shared/components'

export interface NewPasswordFormProps {
  onSubmit: (values: NewPasswordFormValues) => void
  isSubmitting?: boolean
  serverFeedback?: AuthServerFeedback
}

/**
 * S6 — define a new password from a recovery-link token. The token
 * itself is never a prop of this component: it comes from the route
 * (see `NewPasswordPage`) and this form has no way to render, log, or
 * edit it.
 */
export function NewPasswordForm({
  onSubmit,
  isSubmitting = false,
  serverFeedback,
}: NewPasswordFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', passwordConfirmacion: '' },
  })

  const password = useWatch({ control, name: 'password' })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      {serverFeedback ? (
        <Alert tone={serverFeedback.tone}>{serverFeedback.message}</Alert>
      ) : null}

      <FormField label="Nueva contraseña" required error={errors.password?.message}>
        {(controlProps) => (
          <PasswordInput
            {...controlProps}
            autoComplete="new-password"
            disabled={isSubmitting}
            {...register('password')}
          />
        )}
      </FormField>

      <FormField
        label="Confirmar contraseña"
        required
        error={errors.passwordConfirmacion?.message}
      >
        {(controlProps) => (
          <PasswordInput
            {...controlProps}
            autoComplete="new-password"
            disabled={isSubmitting}
            {...register('passwordConfirmacion')}
          />
        )}
      </FormField>

      <PasswordRequirementsList password={password ?? ''} />

      <Button type="submit" loading={isSubmitting} className="w-full">
        Guardar contraseña
      </Button>
    </form>
  )
}
