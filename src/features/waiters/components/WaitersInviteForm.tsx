import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  invitationFormSchema,
  type InvitationFormValues,
} from '@/features/waiters/schemas/invitationSchema'
import { Alert, Button, FormField, Input } from '@/shared/components'

export interface WaitersInviteFormProps {
  /**
   * May reject (e.g. `SSO-4001` — an invitation is already pending for
   * that correo, or `SSO-2005` — the correo already has an account). This
   * form's own `submit` wrapper catches that and leaves the fields as the
   * user left them, mirroring `EventCreateSalonForm`'s established
   * `onSubmit` contract; the caller's `errorMessage` stays the single
   * source of truth for what went wrong.
   */
  onSubmit: (values: InvitationFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  /** A safe, user-facing message for the most recent failed attempt — never `technical_message`. */
  errorMessage?: string
}

/**
 * Invites one waiter — exactly the fields the pinned backend's real
 * `crearValidator` requires (see `schemas/invitationSchema.ts`), nothing
 * more. No role picker: this form always invites `mesero`
 * (`WaitersInviteDialog` resolves that role's real `id_rol` via
 * `GET /roles` and supplies it), since "Invitar mesero" is specifically
 * what this screen offers — a generic personnel-invite panel (any role)
 * is out of scope.
 */
export function WaitersInviteForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
}: WaitersInviteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
  })

  async function submit(values: InvitationFormValues) {
    try {
      await onSubmit(values)
    } catch {
      // The caller's own error UI (`errorMessage` below) already surfaces
      // what went wrong — this form just leaves the fields as-is.
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-4"
    >
      {errorMessage ? (
        <Alert tone="danger" title="No se pudo enviar la invitación">
          <p>{errorMessage}</p>
        </Alert>
      ) : null}

      <FormField label="Nombre" required error={errors.nombre?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={30}
            autoComplete="given-name"
            disabled={isSubmitting}
            {...register('nombre')}
          />
        )}
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Apellido paterno"
          required
          error={errors.apellidoPaterno?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              maxLength={30}
              autoComplete="family-name"
              disabled={isSubmitting}
              {...register('apellidoPaterno')}
            />
          )}
        </FormField>
        <FormField label="Apellido materno" error={errors.apellidoMaterno?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              maxLength={30}
              autoComplete="additional-name"
              disabled={isSubmitting}
              {...register('apellidoMaterno')}
            />
          )}
        </FormField>
      </div>
      <FormField label="Correo" required error={errors.correo?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="email"
            maxLength={100}
            autoComplete="email"
            disabled={isSubmitting}
            {...register('correo')}
          />
        )}
      </FormField>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isSubmitting}>
          Enviar invitación
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
