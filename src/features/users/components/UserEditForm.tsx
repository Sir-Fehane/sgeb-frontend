import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  userEditSchema,
  type UserEditFormValues,
} from '@/features/users/schemas/userEditSchema'
import { Button, FormField, Input } from '@/shared/components'

export interface UserEditFormProps {
  defaultValues: UserEditFormValues
  onSubmit: (values: UserEditFormValues) => Promise<void>
  isSubmitting?: boolean
}

/**
 * Maps exactly to `PUT /usuarios/{uuid}`'s editable field set
 * (`services/usersApi.ts`'s `UpdateUserRequest`) — same field set as the
 * self-service `PUT /usuarios/me` (`ProfileForm`), since both share the
 * pinned backend's `actualizarUsuarioValidator`. `correo`, role, and
 * account-active status are never rendered as inputs here: correo has no
 * update path anywhere in this API, role is immutable (see
 * `types/user.ts`'s module comment), and status is the separate
 * `UserStatusSection` action.
 */
export function UserEditForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: UserEditFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues,
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormField label="Nombre" required error={errors.nombre?.message}>
        {(controlProps) => (
          <Input {...controlProps} disabled={isSubmitting} {...register('nombre')} />
        )}
      </FormField>

      <FormField
        label="Apellido paterno"
        required
        error={errors.apellidoPaterno?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            disabled={isSubmitting}
            {...register('apellidoPaterno')}
          />
        )}
      </FormField>

      <FormField label="Apellido materno" error={errors.apellidoMaterno?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            disabled={isSubmitting}
            {...register('apellidoMaterno')}
          />
        )}
      </FormField>

      <FormField
        label="Teléfono"
        description="10 a 15 dígitos, opcional."
        error={errors.telefono?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="tel"
            disabled={isSubmitting}
            {...register('telefono')}
          />
        )}
      </FormField>

      <Button type="submit" size="sm" loading={isSubmitting} className="w-fit">
        Guardar cambios
      </Button>
    </form>
  )
}
