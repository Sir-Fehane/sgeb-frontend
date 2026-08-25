import { useState } from 'react'

import { BankDataForm } from '@/features/account/components/BankDataForm'
import { ProfileForm } from '@/features/account/components/ProfileForm'
import { useMiPerfilQuery } from '@/features/account/queries/useMiPerfilQuery'
import { useMisDatosBancariosQuery } from '@/features/account/queries/useMisDatosBancariosQuery'
import { useRegistrarMisDatosBancariosMutation } from '@/features/account/queries/useRegistrarMisDatosBancariosMutation'
import { useUpdateMiPerfilMutation } from '@/features/account/queries/useUpdateMiPerfilMutation'
import type { DatosBancariosFormValues } from '@/features/account/schemas/datosBancariosSchema'
import type { ProfileFormValues } from '@/features/account/schemas/profileSchema'
import { isDatosBancariosNoRegistradosError } from '@/features/account/services/usuariosApi'
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
 *
 * Also hosts self-service bank data (`GET`/`POST /usuarios/me/datos-bancarios`)
 * — restricted to `mesero` sessions only. The backend route itself has no
 * role restriction, but the only consumer of this data
 * (`EventPaymentsBlockedSection`'s `meserosSinClabeVigente` blocker) is
 * mesero-specific, so `isMesero` gates both the query (`enabled`) and the
 * card's visibility — same UX-only role-gate pattern `AuditLogPage`'s
 * `canView` already uses, never a substitute for backend authorization.
 * The CLABE masks server-side the moment it's saved, so the form always
 * starts blank; see `BankDataForm`'s comment.
 */
export function ProfilePage() {
  const session = useOidcSessionStore((state) => state.session)
  const isMesero = session.status === 'authenticated' && session.user.rol === 'mesero'
  const profileQuery = useMiPerfilQuery()
  const updateMutation = useUpdateMiPerfilMutation()
  const [showSavedToast, setShowSavedToast] = useState(false)

  const bankDataQuery = useMisDatosBancariosQuery(isMesero)
  const registrarBankDataMutation = useRegistrarMisDatosBancariosMutation()
  const [isEditingBankData, setEditingBankData] = useState(false)
  const [showBankSavedToast, setShowBankSavedToast] = useState(false)

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

  async function handleSubmitBankData(values: DatosBancariosFormValues) {
    setShowBankSavedToast(false)
    try {
      await registrarBankDataMutation.mutateAsync(values)
      setEditingBankData(false)
      setShowBankSavedToast(true)
    } catch {
      // Same reasoning as `handleSubmit` — reflected via
      // `registrarBankDataMutation.isError`/`.error` below.
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

          {isMesero ? (
            <Card>
              <CardHeader>
                <CardTitle>Datos bancarios</CardTitle>
              </CardHeader>
              <CardContent>
                {showBankSavedToast ? (
                  <Toast
                    title="Datos bancarios guardados"
                    onDismiss={() => {
                      setShowBankSavedToast(false)
                    }}
                  >
                    <p>Tu CLABE se guardó correctamente.</p>
                  </Toast>
                ) : null}

                {registrarBankDataMutation.isError ? (
                  <Alert
                    tone="danger"
                    title="No se pudieron guardar tus datos bancarios"
                    className="mb-4"
                  >
                    <p>
                      {toSafeErrorMessage(
                        registrarBankDataMutation.error,
                        'Ocurrió un error inesperado.',
                      )}
                    </p>
                  </Alert>
                ) : null}

                {bankDataQuery.isPending ? (
                  <div className="flex items-center gap-2">
                    <Spinner
                      size="sm"
                      label="Cargando tus datos bancarios"
                      aria-label="Cargando tus datos bancarios"
                    />
                    <Text size="sm" className="text-muted-foreground">
                      Cargando tus datos bancarios…
                    </Text>
                  </div>
                ) : bankDataQuery.isError &&
                  !isDatosBancariosNoRegistradosError(bankDataQuery.error) ? (
                  <Alert
                    tone="warning"
                    title="No pudimos cargar tus datos bancarios"
                    action={
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          void bankDataQuery.refetch()
                        }}
                      >
                        Reintentar
                      </Button>
                    }
                  >
                    <p>
                      {toSafeErrorMessage(
                        bankDataQuery.error,
                        'Ocurrió un error inesperado.',
                      )}
                    </p>
                  </Alert>
                ) : bankDataQuery.data && !isEditingBankData ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <Text size="sm" className="text-muted-foreground">
                        CLABE
                      </Text>
                      <Text>{bankDataQuery.data.clabeEnmascarada}</Text>
                    </div>
                    <div>
                      <Text size="sm" className="text-muted-foreground">
                        Banco
                      </Text>
                      <Text>{bankDataQuery.data.banco}</Text>
                    </div>
                    <div>
                      <Text size="sm" className="text-muted-foreground">
                        Titular de la cuenta
                      </Text>
                      <Text>{bankDataQuery.data.titularCuenta}</Text>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => {
                        setEditingBankData(true)
                      }}
                    >
                      Actualizar datos bancarios
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {!bankDataQuery.data ? (
                      <Text size="sm" className="text-muted-foreground">
                        Aún no registras tus datos bancarios.
                      </Text>
                    ) : null}
                    <BankDataForm
                      onSubmit={handleSubmitBankData}
                      isSubmitting={registrarBankDataMutation.isPending}
                      submitLabel={
                        bankDataQuery.data
                          ? 'Guardar cambios'
                          : 'Registrar datos bancarios'
                      }
                    />
                    {bankDataQuery.data ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        disabled={registrarBankDataMutation.isPending}
                        onClick={() => {
                          setEditingBankData(false)
                        }}
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
