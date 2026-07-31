import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'

import { CodeInput } from '@/features/auth/components/CodeInput'
import {
  twoFactorSchema,
  type TwoFactorFormValues,
} from '@/features/auth/schemas/twoFactorSchema'
import type { AuthServerFeedback } from '@/features/auth/types/auth'
import { Alert, Button, Caption, ErrorText } from '@/shared/components'

export interface TwoFactorFormProps {
  /** Rendered as-is when supplied (S3: `correo_enmascarado`). */
  correoEnmascarado?: string | undefined
  /** Rendered as static text only — no countdown engine (S3: `expira_en`). */
  expiraEnSegundos?: number | undefined
  onSubmit: (values: TwoFactorFormValues) => void
  onResend: () => void
  isSubmitting?: boolean
  /** Resend availability is represented via this prop, not an invented timer. */
  resendDisabled?: boolean
  serverFeedback?: AuthServerFeedback
}

const CODE_FIELD_ID = 'codigo-verificacion'
const CODE_ERROR_ID = 'codigo-verificacion-error'

/**
 * Web adaptation of S3 — no final wireframe exists for this state on the
 * web client (docs/FrontendArchitecture.md §9, §19 item 6), so this
 * composition is deliberately conservative. `ticket_2fa` never appears as
 * a prop here at all: it is internal flow data the calling page keeps to
 * itself and would merge into the real request once wired.
 */
export function TwoFactorForm({
  correoEnmascarado,
  expiraEnSegundos,
  onSubmit,
  onResend,
  isSubmitting = false,
  resendDisabled = false,
  serverFeedback,
}: TwoFactorFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { codigo: '', confiarDispositivo: false },
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

      <div className="flex flex-col items-center gap-1 text-center">
        <Caption>
          {correoEnmascarado
            ? `Enviamos un código de 6 dígitos a ${correoEnmascarado}`
            : 'Enviamos un código de 6 dígitos a tu correo.'}
        </Caption>
        {typeof expiraEnSegundos === 'number' ? (
          <Caption>Expira en {expiraEnSegundos} segundos.</Caption>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <label htmlFor={CODE_FIELD_ID} className="sr-only">
          Código de verificación
        </label>
        <Controller
          control={control}
          name="codigo"
          render={({ field }) => (
            <CodeInput
              id={CODE_FIELD_ID}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isSubmitting}
              aria-invalid={errors.codigo ? true : undefined}
              aria-describedby={errors.codigo ? CODE_ERROR_ID : undefined}
            />
          )}
        />
        {errors.codigo ? (
          <ErrorText id={CODE_ERROR_ID}>{errors.codigo.message}</ErrorText>
        ) : null}
      </div>

      <label className="text-body-sm text-foreground flex items-center justify-center gap-2 font-sans">
        <input
          type="checkbox"
          disabled={isSubmitting}
          className="border-input size-4 rounded"
          {...register('confiarDispositivo')}
        />
        Confiar en este dispositivo 30 días
      </label>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Verificar
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={onResend}
        disabled={resendDisabled || isSubmitting}
        className="w-full"
      >
        Reenviar código
      </Button>
    </form>
  )
}
