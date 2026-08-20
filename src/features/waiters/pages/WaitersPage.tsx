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
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

const SEARCH_DEBOUNCE_MS = 300

function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return fallback
}

/**
 * Routed at /meseros. Live wiring layer around `WaitersContent` (the
 * waiter roster, `GET /usuarios?rol=mesero`) and `InvitationsSection`
 * (`GET /usuarios/invitaciones`) — replaces the previous fixture-backed
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

  const waitersQuery = useWaitersQuery({ ...filters, search: debouncedSearch })
  const invitationsQuery = useInvitationsQuery()
  const rolesQuery = useRolesQuery()
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
        waiters={waitersQuery.data ?? []}
        isLoading={waitersQuery.isPending}
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
    </div>
  )
}
