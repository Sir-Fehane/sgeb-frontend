import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  profileSchema,
  type ProfileFormValues,
} from '@/features/account/schemas/profileSchema'
import { Button, FormField, Input } from '@/shared/components'

export interface ProfileFormProps {
  defaultValues: ProfileFormValues
  onSubmit: (values: ProfileFormValues) => Promise<void>
  isSubmitting?: boolean
}

/**
 * Maps exactly to `PUT /usuarios/me`'s editable field set
 * (`services/usuariosApi.ts`'s `UpdateMiPerfilRequest`) — `correo`, role,
 * and account-active status are never rendered as inputs here at all (not
 * merely disabled): the backend's own `actualizarUsuarioValidator` doesn't
 * accept them from the subject, and no password/2FA field belongs in SGEB
 * (SSO-owned). `ProfilePage` renders those as read-only context separately.
 */
export function ProfileForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
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

      <Button type="submit" loading={isSubmitting} className="w-fit">
        Guardar cambios
      </Button>
    </form>
  )
}
