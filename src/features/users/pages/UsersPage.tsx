import { useEffect, useState } from 'react'

import { InviteStaffDialog } from '@/features/users/components/InviteStaffDialog'
import { UserDetailDialog } from '@/features/users/components/UserDetailDialog'
import { UsersContent } from '@/features/users/components/UsersContent'
import { useUsersQuery } from '@/features/users/queries/useUsersQuery'
import type { StaffInviteFormValues } from '@/features/users/schemas/staffInviteSchema'
import {
  DEFAULT_USERS_FILTER_STATE,
  type UsersFilterState,
} from '@/features/users/types/user'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { InvitationDeeplinkDialog } from '@/features/waiters/components/InvitationDeeplinkDialog'
import { useCreateInvitationMutation } from '@/features/waiters/queries/useCreateInvitationMutation'
import { useRolesQuery } from '@/features/waiters/queries/useRolesQuery'
import type { InvitationDeeplinkResult } from '@/features/waiters/types/invitation'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

const SEARCH_DEBOUNCE_MS = 300

/** `capitan`/`admin` only — `mesero` invites are exclusively `WaitersInviteForm`'s job (`InvitacionesController.crear`'s own role gate). */
const INVITABLE_STAFF_ROLES = new Set(['capitan', 'admin'])

function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return fallback
}

/**
 * Routed at /usuarios — `admin`-only on this frontend (product-scoped:
 * staff invitations, user management, and admin actions), even though the
 * backend's own `middleware.rol(['capitan', 'admin'])` for `GET /usuarios`
 * would still permit a `capitan` session to call it. `NAV_ITEMS` hides the
 * sidebar entry for non-admin (`shared/components/layout/nav-items.ts`);
 * `isAdmin` here is the route-level backstop for a direct `/usuarios`
 * visit — `UsersContent`'s `canView` renders `UsersForbiddenState` instead
 * of the real directory, and `useUsersQuery`'s `enabled: isAdmin` means a
 * non-admin session never even fires `GET /usuarios` — same pattern
 * `AuditLogPage`'s `canView`/`useAuditLogQuery`'s `enabled` already
 * establish for `/bitacora`. Distinct from `/meseros` (`WaitersPage`),
 * which stays the specialized mesero-recruitment + invitation screen and
 * is not merged into or duplicated by this page.
 *
 * An `admin` session additionally sees "Invitar capitán o admin"
 * (`InviteStaffDialog`), reusing the same `POST /usuarios/invitaciones`
 * (`useCreateInvitationMutation`) and one-time-deeplink dialog `/meseros`
 * uses — only the form differs (a role picker instead of a fixed mesero
 * target), matching `InvitacionesController.crear`'s own confirmed
 * server-side rule that only an admin caller may target a non-mesero role.
 * A `capitan` session never sees this button. The button itself stays
 * disabled until `GET /roles` resolves (`invitableStaffRoles.length === 0`)
 * — same "never open the dialog with an empty role picker" guard
 * `WaitersPage`'s `isInviteDisabled={meseroRoleId === undefined}` already
 * establishes for the mesero invite flow.
 */
export function UsersPage() {
  const [filters, setFilters] = useState<UsersFilterState>(DEFAULT_USERS_FILTER_STATE)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [filters.search])

  const session = useOidcSessionStore((state) => state.session)
  const currentUserUuid =
    session.status === 'authenticated' ? session.user.sub : undefined
  const isAdmin = session.status === 'authenticated' && session.user.rol === 'admin'

  const usersQuery = useUsersQuery({ ...filters, search: debouncedSearch }, isAdmin)

  const rolesQuery = useRolesQuery()
  const invitableStaffRoles = (rolesQuery.data ?? []).filter((role) =>
    INVITABLE_STAFF_ROLES.has(role.nombre),
  )
  const createInvitationMutation = useCreateInvitationMutation()
  const [isInviteStaffOpen, setInviteStaffOpen] = useState(false)
  const [staffDeeplinkResult, setStaffDeeplinkResult] =
    useState<InvitationDeeplinkResult | null>(null)

  async function handleInviteStaff(values: StaffInviteFormValues) {
    const result = await createInvitationMutation.mutateAsync({
      idRolDestino: values.idRolDestino,
      nombre: values.nombre,
      apellidoPaterno: values.apellidoPaterno,
      ...(values.apellidoMaterno ? { apellidoMaterno: values.apellidoMaterno } : {}),
      correo: values.correo,
    })
    setInviteStaffOpen(false)
    setStaffDeeplinkResult(result)
  }

  return (
    <>
      <UsersContent
        canView={isAdmin}
        users={usersQuery.data ?? []}
        isLoading={usersQuery.isPending}
        {...(usersQuery.error
          ? {
              errorMessage: toSafeErrorMessage(
                usersQuery.error,
                'Ocurrió un error inesperado al cargar los usuarios.',
              ),
            }
          : {})}
        onRetry={() => void usersQuery.refetch()}
        filters={filters}
        onFilterChange={setFilters}
        onSelectUser={setSelectedUuid}
        canInviteStaff={isAdmin}
        onInviteStaff={() => {
          setInviteStaffOpen(true)
        }}
        isInviteStaffDisabled={invitableStaffRoles.length === 0}
      />

      {selectedUuid ? (
        <UserDetailDialog
          uuidUsuario={selectedUuid}
          currentUserUuid={currentUserUuid}
          onClose={() => {
            setSelectedUuid(null)
          }}
        />
      ) : null}

      {isAdmin ? (
        <InviteStaffDialog
          open={isInviteStaffOpen}
          invitableRoles={invitableStaffRoles}
          onSubmit={handleInviteStaff}
          onCancel={() => {
            setInviteStaffOpen(false)
          }}
          isSubmitting={createInvitationMutation.isPending}
          {...(createInvitationMutation.error
            ? {
                errorMessage: toSafeErrorMessage(
                  createInvitationMutation.error,
                  'No se pudo enviar la invitación.',
                ),
              }
            : {})}
        />
      ) : null}

      {staffDeeplinkResult ? (
        <InvitationDeeplinkDialog
          result={staffDeeplinkResult}
          onClose={() => {
            setStaffDeeplinkResult(null)
          }}
        />
      ) : null}
    </>
  )
}
