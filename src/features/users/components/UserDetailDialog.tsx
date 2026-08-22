import { useState } from 'react'

import { UserEditForm } from '@/features/users/components/UserEditForm'
import { UserRoleBadge } from '@/features/users/components/UserRoleBadge'
import { UserStatusSection } from '@/features/users/components/UserStatusSection'
import { useSetUserActiveMutation } from '@/features/users/queries/useSetUserActiveMutation'
import { useUpdateUserMutation } from '@/features/users/queries/useUpdateUserMutation'
import { useUserQuery } from '@/features/users/queries/useUserQuery'
import type { UserEditFormValues } from '@/features/users/schemas/userEditSchema'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { Alert, Button, Dialog, Separator, Skeleton, Text } from '@/shared/components'

export interface UserDetailDialogProps {
  uuidUsuario: string
  /** The authenticated caller's own `uuid_usuario` (session `sub`) — drives `UserStatusSection`'s self-target guard. */
  currentUserUuid: string | undefined
  onClose: () => void
}

function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return fallback
}

/**
 * Detail + edit + status-change surface for one user, opened from
 * `UserListItem`. Self-contained (owns its own `GET /usuarios/{uuid}`
 * query and both mutations) rather than a thin prop-wrapper like
 * `WaitersInviteDialog` — there is no shared parent state a page needs to
 * own across dialog opens, unlike the invite flow's one-time deeplink
 * result.
 */
export function UserDetailDialog({
  uuidUsuario,
  currentUserUuid,
  onClose,
}: UserDetailDialogProps) {
  const userQuery = useUserQuery(uuidUsuario)
  const updateMutation = useUpdateUserMutation()
  const setActiveMutation = useSetUserActiveMutation()
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  async function handleEditSubmit(values: UserEditFormValues) {
    setSavedMessage(null)
    try {
      await updateMutation.mutateAsync({
        uuidUsuario,
        request: {
          nombre: values.nombre,
          apellidoPaterno: values.apellidoPaterno,
          apellidoMaterno: values.apellidoMaterno === '' ? null : values.apellidoMaterno,
          telefono: values.telefono === '' ? null : values.telefono,
        },
      })
      setSavedMessage('Los datos se guardaron correctamente.')
    } catch {
      // Reflected via `updateMutation.isError`/`.error` below.
    }
  }

  function handleActivate() {
    setActiveMutation.mutate({ uuidUsuario, activo: true })
  }

  function handleDeactivate() {
    setActiveMutation.mutate({ uuidUsuario, activo: false })
  }

  return (
    <Dialog open onClose={onClose} title="Detalle de usuario">
      {userQuery.isPending ? (
        <div role="status" aria-label="Cargando usuario" className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : userQuery.isError ? (
        <Alert tone="danger" title="No pudimos cargar este usuario">
          <p>{toSafeErrorMessage(userQuery.error, 'Ocurrió un error inesperado.')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              void userQuery.refetch()
            }}
          >
            Reintentar
          </Button>
        </Alert>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <Text className="font-semibold">{userQuery.data.nombreCompleto}</Text>
            <Text size="sm" className="text-muted-foreground">
              {userQuery.data.correo}
            </Text>
            <div>
              <UserRoleBadge rol={userQuery.data.rol} />
            </div>
          </div>

          <Separator />

          {savedMessage ? (
            <Alert tone="success" title="Cambios guardados">
              <p>{savedMessage}</p>
            </Alert>
          ) : null}
          {updateMutation.isError ? (
            <Alert tone="danger" title="No se pudieron guardar los cambios">
              <p>
                {toSafeErrorMessage(updateMutation.error, 'Ocurrió un error inesperado.')}
              </p>
            </Alert>
          ) : null}

          <UserEditForm
            defaultValues={{
              nombre: userQuery.data.nombre,
              apellidoPaterno: userQuery.data.apellidoPaterno,
              apellidoMaterno: userQuery.data.apellidoMaterno ?? '',
              telefono: userQuery.data.telefono ?? '',
            }}
            onSubmit={handleEditSubmit}
            isSubmitting={updateMutation.isPending}
          />

          <Separator />

          <UserStatusSection
            estadoCuenta={userQuery.data.estadoCuenta}
            isSelf={currentUserUuid === userQuery.data.uuidUsuario}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            isSubmitting={setActiveMutation.isPending}
            {...(setActiveMutation.isError
              ? {
                  errorMessage: toSafeErrorMessage(
                    setActiveMutation.error,
                    'Ocurrió un error inesperado.',
                  ),
                }
              : {})}
          />
        </div>
      )}
    </Dialog>
  )
}
