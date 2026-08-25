import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import type { RoleViewModel } from '@/features/waiters/types/role'
import {
  staffInviteFormSchema,
  type StaffInviteFormValues,
} from '@/features/users/schemas/staffInviteSchema'
import { USER_ROLE_LABELS } from '@/features/users/utils/userPresentation'
import { Alert, Button, FormField, Input, Select } from '@/shared/components'

export interface InviteStaffFormProps {
  /** Only `capitan`/`admin` — inviting `mesero` stays exclusively `/meseros`'s `WaitersInviteForm` (`InvitacionesController.crear`'s own admin-only "invite non-mesero" gate). */
  invitableRoles: readonly RoleViewModel[]
  onSubmit: (values: StaffInviteFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  errorMessage?: string
}

/**
 * Invites a capitán or admin — the admin-only counterpart to
 * `features/waiters/components/WaitersInviteForm.tsx`. Same field set plus
 * a role picker, since (unlike the mesero-only form) the target role isn't
 * fixed. Reuses `POST /usuarios/invitaciones` through
 * `features/waiters/queries/useCreateInvitationMutation.ts` — the endpoint
 * and its response contract are identical, only the form differs (see
 * `UsersPage.tsx`'s wiring).
 */
export function InviteStaffForm({
  invitableRoles,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
}: InviteStaffFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffInviteFormValues>({
    resolver: zodResolver(staffInviteFormSchema),
  })

  async function submit(values: StaffInviteFormValues) {
    try {
      await onSubmit(values)
    } catch {
      // The caller's own error UI (`errorMessage` below) already surfaces
      // what went wrong — this form just leaves the fields as-is, same
      // convention as `WaitersInviteForm`.
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

      <FormField label="Rol" required error={errors.idRolDestino?.message}>
        {(controlProps) => (
          <Select
            {...controlProps}
            disabled={isSubmitting}
            {...register('idRolDestino', { valueAsNumber: true })}
          >
            <option value="">Selecciona un rol</option>
            {invitableRoles.map((role) => (
              <option key={role.idRol} value={role.idRol}>
                {USER_ROLE_LABELS[role.nombre]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

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
