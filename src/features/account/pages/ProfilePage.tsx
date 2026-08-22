import { useState } from 'react'

import { ProfileForm } from '@/features/account/components/ProfileForm'
import { useMiPerfilQuery } from '@/features/account/queries/useMiPerfilQuery'
import { useUpdateMiPerfilMutation } from '@/features/account/queries/useUpdateMiPerfilMutation'
import type { ProfileFormValues } from '@/features/account/schemas/profileSchema'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import type { OidcRole } from '@/features/oidc-client/types/userInfo'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SectionHeading,
  Spinner,
  Text,
  Toast,
} from '@/shared/components'

/**
 * Same 3-role map `AccountMenu` renders — duplicated locally rather than
 * exported/shared, matching this codebase's established "small,
 * feature-local constant over a premature cross-feature abstraction"
 * convention (e.g. `EventCreatePage`'s locally-duplicated
 * `toSafeErrorMessage`).
 */
const ROLE_LABELS: Record<OidcRole, string> = {
  admin: 'Administrador',
  capitan: 'Capitán',
  mesero: 'Mesero',
}

/** Never renders `technical_message` — same helper duplicated across every live-query page. */
function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return fallback
}

/**
 * Routed at /perfil, reached only from `AccountMenu`'s "Mi perfil" entry —
 * never from the global sidebar (`NAV_ITEMS` has no entry for it, by
 * design: this is account-level, not a business navigation destination).
 *
 * Only the four fields the pinned backend's `PUT /usuarios/me` actually
 * accepts from the subject are editable (`ProfileForm`). `correo` and role
 * are rendered read-only below as identity context, deliberately sourced
 * from two different places: `correo` from the real SGEB profile record
 * (`GET /usuarios/me`), role from the authenticated OIDC session's own
 * `rol` claim (the same source `AccountMenu` already reads) — SGEB has no
 * self-service role field at all, so there is nothing to fetch for it. No
 * password/2FA/account-security control exists here: that belongs to the
 * separate SSO project, never to this screen.
 */
export function ProfilePage() {
  const session = useOidcSessionStore((state) => state.session)
  const profileQuery = useMiPerfilQuery()
  const updateMutation = useUpdateMiPerfilMutation()
  const [showSavedToast, setShowSavedToast] = useState(false)

  async function handleSubmit(values: ProfileFormValues) {
    setShowSavedToast(false)
    try {
      await updateMutation.mutateAsync({
        nombre: values.nombre,
        apellidoPaterno: values.apellidoPaterno,
        apellidoMaterno: values.apellidoMaterno === '' ? null : values.apellidoMaterno,
        telefono: values.telefono === '' ? null : values.telefono,
      })
      setShowSavedToast(true)
    } catch {
      // Already reflected reactively via `updateMutation.isError`/`.error`,
      // rendered as an `Alert` below — nothing further to do here, but the
      // rejection must be caught somewhere so it never surfaces as an
      // unhandled promise rejection (this handler is invoked as
      // `void handleSubmit(onSubmit)(event)`, so nothing else awaits it).
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <SectionHeading className="text-heading">Mi perfil</SectionHeading>

      {showSavedToast ? (
        <Toast
          title="Perfil actualizado"
          onDismiss={() => {
            setShowSavedToast(false)
          }}
        >
          <p>Tus datos se guardaron correctamente.</p>
        </Toast>
      ) : null}

      {profileQuery.isPending ? (
        <div className="flex items-center gap-2">
          <Spinner size="sm" label="Cargando tu perfil" aria-label="Cargando tu perfil" />
          <Text size="sm" className="text-muted-foreground">
            Cargando tu perfil…
          </Text>
        </div>
      ) : profileQuery.isError ? (
        <Alert
          tone="danger"
          title="No pudimos cargar tu perfil"
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void profileQuery.refetch()
              }}
            >
              Reintentar
            </Button>
          }
        >
          <p>{toSafeErrorMessage(profileQuery.error, 'Ocurrió un error inesperado.')}</p>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información personal</CardTitle>
            </CardHeader>
            <CardContent>
              {updateMutation.isError ? (
                <Alert
                  tone="danger"
                  title="No se pudo guardar tu perfil"
                  className="mb-4"
                >
                  <p>
                    {toSafeErrorMessage(
                      updateMutation.error,
                      'Ocurrió un error inesperado.',
                    )}
                  </p>
                </Alert>
              ) : null}
              <ProfileForm
                defaultValues={{
                  nombre: profileQuery.data.nombre,
                  apellidoPaterno: profileQuery.data.apellidoPaterno,
                  apellidoMaterno: profileQuery.data.apellidoMaterno ?? '',
                  telefono: profileQuery.data.telefono ?? '',
                }}
                onSubmit={handleSubmit}
                isSubmitting={updateMutation.isPending}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información de cuenta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Text size="sm" className="text-muted-foreground">
                  Correo
                </Text>
                <Text>{profileQuery.data.correo}</Text>
              </div>
              {session.status === 'authenticated' && session.user.rol ? (
                <div>
                  <Text size="sm" className="text-muted-foreground">
                    Rol
                  </Text>
                  <Text>{ROLE_LABELS[session.user.rol]}</Text>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
