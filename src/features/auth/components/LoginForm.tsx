import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/loginSchema'
import type { AuthServerFeedback } from '@/features/auth/types/auth'
import { Alert, Button, FormField, Input } from '@/shared/components'

export interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => void
  isSubmitting?: boolean
  serverFeedback?: AuthServerFeedback
}

/**
 * S1 — shared by `admin` and `capitan` (only one login screen is
 * wireframed; docs/FrontendArchitecture.md §5.1). Accepts an `onSubmit`
 * callback so API integration can be wired later without touching this
 * component — see `LoginPage` for the current dev-only handler.
 */
export function LoginForm({
  onSubmit,
  isSubmitting = false,
  serverFeedback,
}: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
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
            autoComplete="username"
            disabled={isSubmitting}
            {...register('correo')}
          />
        )}
      </FormField>

      <FormField label="Contraseña" required error={errors.password?.message}>
        {(controlProps) => (
          <PasswordInput
            {...controlProps}
            autoComplete="current-password"
            disabled={isSubmitting}
            {...register('password')}
          />
        )}
      </FormField>

      {/*
       * S1's wireframe also shows a "Recordar este equipo" checkbox.
       * Deliberately omitted here — see the comment on `loginSchema` for
       * why: the login contract has no matching request field, and an
       * interactive control with no real effect would be fake
       * functionality.
       */}
      <div className="flex justify-end">
        <Link
          to="/recuperar"
          className="text-body-sm text-primary font-sans underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Entrar
      </Button>
    </form>
  )
}
