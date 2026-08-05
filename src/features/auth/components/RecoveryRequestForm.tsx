import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import {
  recoveryRequestSchema,
  type RecoveryRequestFormValues,
} from '@/features/auth/schemas/recoveryRequestSchema'
import type { AuthServerFeedback } from '@/features/auth/types/auth'
import { Alert, Button, FormField, Input } from '@/shared/components'

export interface RecoveryRequestFormProps {
  onSubmit: (values: RecoveryRequestFormValues) => void
  isSubmitting?: boolean
  /**
   * Whatever the future integration passes here must be the server's
   * literal SSO-0002 copy, which is always identical whether or not the
   * account exists (docs/sso/diccionario-errores-sso.md §2) — this
   * component has no branch based on the entered email, so it cannot
   * itself introduce account-enumeration behavior.
   */
  serverFeedback?: AuthServerFeedback
}

/** S5 — request a password-recovery link. */
export function RecoveryRequestForm({
  onSubmit,
  isSubmitting = false,
  serverFeedback,
}: RecoveryRequestFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoveryRequestFormValues>({
    resolver: zodResolver(recoveryRequestSchema),
    defaultValues: { correo: '' },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      {serverFeedback ? (
        <Alert tone={serverFeedback.tone}>{serverFeedback.message}</Alert>
      ) : null}

      <FormField label="Correo" required error={errors.correo?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="email"
            autoComplete="email"
            disabled={isSubmitting}
            {...register('correo')}
          />
        )}
      </FormField>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Enviar enlace
      </Button>

      <Link
        to="/login"
        className="text-body-sm text-primary text-center font-sans underline-offset-4 hover:underline"
      >
        Volver a iniciar sesión
      </Link>
    </form>
  )
}
