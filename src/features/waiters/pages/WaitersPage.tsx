import { useEffect, useState } from 'react'

import { InvitationDeeplinkDialog } from '@/features/waiters/components/InvitationDeeplinkDialog'
import { InvitationsSection } from '@/features/waiters/components/InvitationsSection'
import { WaitersContent } from '@/features/waiters/components/WaitersContent'
import { WaitersInviteDialog } from '@/features/waiters/components/WaitersInviteDialog'
import { useCreateInvitationMutation } from '@/features/waiters/queries/useCreateInvitationMutation'
import { useInvitationsQuery } from '@/features/waiters/queries/useInvitationsQuery'
import { useResendInvitationMutation } from '@/features/waiters/queries/useResendInvitationMutation'
import { useRevokeInvitationMutation } from '@/features/waiters/queries/useRevokeInvitationMutation'
import { useRolesQuery } from '@/features/waiters/queries/useRolesQuery'
import { useWaitersQuery } from '@/features/waiters/queries/useWaitersQuery'
import type { InvitationFormValues } from '@/features/waiters/schemas/invitationSchema'
import {
  DEFAULT_WAITERS_FILTER_STATE,
  type WaitersFilterState,
} from '@/features/waiters/types/waiter'
import type { InvitationDeeplinkResult } from '@/features/waiters/types/invitation'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

const SEARCH_DEBOUNCE_MS = 300

function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return fallback
}

/**
 * Routed at /meseros — `capitán`/`admin` only on this frontend: a `mesero`
 * session never uses this web console at all (the native iOS app is the
 * mesero product, docs/FrontendArchitecture.md §2/§10.3), so this whole
 * screen is product-scoped away from it, same reasoning `UsersPage` already
 * applies to `/usuarios`. `NAV_ITEMS` hides the sidebar entry for a `mesero`
 * session (`shared/components/layout/nav-items.ts`); `canView` here is the
 * route-level backstop for a direct `/meseros` visit — `WaitersContent`
 * renders `WaitersForbiddenState` instead of the real roster, and
 * `useWaitersQuery`/`useInvitationsQuery`/`useRolesQuery`'s `enabled: canView`
 * means a `mesero` session never even fires those requests, same pattern
 * `UsersPage`/`AuditLogPage` already establish.
 *
 * Live wiring layer around `WaitersContent` (the waiter roster, `GET
 * /usuarios?rol=mesero`) and `InvitationsSection` (`GET
 * /usuarios/invitaciones`) — replaces the previous fixture-backed
 * foundation entirely. "Invitar mesero" now opens a real dialog
 * (`WaitersInviteDialog`) that calls the real, confirmed
 * `POST /usuarios/invitaciones`; the button stays disabled only until the
 * real mesero role id resolves from `GET /roles` (never a hardcoded id —
 * see `WaitersInviteForm`'s comment).
 */
export function WaitersPage() {
  const [filters, setFilters] = useState<WaitersFilterState>(DEFAULT_WAITERS_FILTER_STATE)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [filters.search])

  const session = useOidcSessionStore((state) => state.session)
  const canView =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  const waitersQuery = useWaitersQuery({ ...filters, search: debouncedSearch }, canView)
  const invitationsQuery = useInvitationsQuery({}, canView)
  const rolesQuery = useRolesQuery(canView)
  const meseroRoleId = rolesQuery.data?.find((role) => role.nombre === 'mesero')?.idRol

  const [isInviteOpen, setInviteOpen] = useState(false)
  const [deeplinkResult, setDeeplinkResult] = useState<InvitationDeeplinkResult | null>(
    null,
  )
  const [pendingAction, setPendingAction] = useState<
    { idInvitacion: number; kind: 'revoke' | 'resend' } | undefined
  >()

  const createInvitationMutation = useCreateInvitationMutation()
  const revokeInvitationMutation = useRevokeInvitationMutation()
  const resendInvitationMutation = useResendInvitationMutation()

  async function handleCreateInvitation(values: InvitationFormValues) {
    if (meseroRoleId === undefined) {
      // The invite button stays disabled until `meseroRoleId` resolves —
      // see `isInviteDisabled` below — so this form can only be open and
      // submittable once it's already defined.
      return
    }
    const result = await createInvitationMutation.mutateAsync({
      idRolDestino: meseroRoleId,
      nombre: values.nombre,
      apellidoPaterno: values.apellidoPaterno,
      ...(values.apellidoMaterno ? { apellidoMaterno: values.apellidoMaterno } : {}),
      correo: values.correo,
    })
    setInviteOpen(false)
    setDeeplinkResult(result)
  }

  async function handleRevoke(idInvitacion: number) {
    setPendingAction({ idInvitacion, kind: 'revoke' })
    try {
      await revokeInvitationMutation.mutateAsync(idInvitacion)
    } catch {
      // Surfaced separately below via `revokeInvitationMutation.error` is
      // deliberately not done — a failed revoke on one row shows nothing
      // new to invalidate; the row's own badge/actions simply stay as they
      // were, and the user can retry.
    } finally {
      setPendingAction(undefined)
    }
  }

  async function handleResend(idInvitacion: number) {
    setPendingAction({ idInvitacion, kind: 'resend' })
    try {
      const result = await resendInvitationMutation.mutateAsync(idInvitacion)
      setDeeplinkResult(result)
    } catch {
      // Same reasoning as `handleRevoke` — the row stays as-is on failure.
    } finally {
      setPendingAction(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <WaitersContent
        canView={canView}
        waiters={waitersQuery.data ?? []}
        isLoading={canView && waitersQuery.isPending}
        {...(waitersQuery.error
          ? {
              errorMessage: toSafeErrorMessage(
                waitersQuery.error,
                'Ocurrió un error inesperado al cargar los meseros.',
              ),
            }
          : {})}
        onRetry={() => void waitersQuery.refetch()}
        filters={filters}
        onFilterChange={setFilters}
        onInvite={() => {
          setInviteOpen(true)
        }}
        isInviteDisabled={meseroRoleId === undefined}
      />

      {canView ? (
        <>
          <InvitationsSection
            invitations={invitationsQuery.data ?? []}
            isLoading={invitationsQuery.isPending}
            {...(invitationsQuery.error
              ? {
                  errorMessage: toSafeErrorMessage(
                    invitationsQuery.error,
                    'Ocurrió un error inesperado al cargar las invitaciones.',
                  ),
                }
              : {})}
            onRevoke={(id) => void handleRevoke(id)}
            onResend={(id) => void handleResend(id)}
            {...(pendingAction ? { pendingAction } : {})}
          />

          <WaitersInviteDialog
            open={isInviteOpen}
            onSubmit={handleCreateInvitation}
            onCancel={() => {
              setInviteOpen(false)
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

          {deeplinkResult ? (
            <InvitationDeeplinkDialog
              result={deeplinkResult}
              onClose={() => {
                setDeeplinkResult(null)
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
