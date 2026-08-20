import { InvitationStatusBadge } from '@/features/waiters/components/InvitationStatusBadge'
import type { InvitationViewModel } from '@/features/waiters/types/invitation'
import { formatInvitationDateTime } from '@/features/waiters/utils/invitationFormatting'
import { Button, Caption } from '@/shared/components'

export interface InvitationListItemProps {
  invitation: InvitationViewModel
  onRevoke: (idInvitacion: number) => void
  onResend: (idInvitacion: number) => void
  isRevoking?: boolean
  isResending?: boolean
}

/** `pendiente`/`expirada` are the only states a real action applies to — `usada` already has an account (manage it via `PATCH /usuarios/{uuid}` instead, per the backend's own `SSO-3002` message), and `revocada` is terminal. */
const ACTIONABLE_STATES: InvitationViewModel['estado'][] = ['pendiente', 'expirada']

export function InvitationListItem({
  invitation,
  onRevoke,
  onResend,
  isRevoking = false,
  isResending = false,
}: InvitationListItemProps) {
  const showActions = ACTIONABLE_STATES.includes(invitation.estado)
  const isBusy = isRevoking || isResending

  return (
    <li className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-body-sm font-semibold">
          {invitation.nombreCompleto}
        </span>
        <Caption>{invitation.correo}</Caption>
        <Caption>Expira: {formatInvitationDateTime(invitation.expiraEn)}</Caption>
      </div>

      <div className="flex items-center gap-2">
        <InvitationStatusBadge estado={invitation.estado} />
        {showActions ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={isResending}
              disabled={isBusy}
              onClick={() => {
                onResend(invitation.idInvitacion)
              }}
            >
              Reenviar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={isRevoking}
              disabled={isBusy}
              onClick={() => {
                onRevoke(invitation.idInvitacion)
              }}
            >
              Revocar
            </Button>
          </>
        ) : null}
      </div>
    </li>
  )
}
