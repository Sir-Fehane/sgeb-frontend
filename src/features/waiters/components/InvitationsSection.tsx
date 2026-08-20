import { useId } from 'react'

import { InvitationListItem } from '@/features/waiters/components/InvitationListItem'
import type { InvitationViewModel } from '@/features/waiters/types/invitation'
import {
  Alert,
  Card,
  CardContent,
  SectionHeading,
  Skeleton,
  Text,
} from '@/shared/components'

export interface InvitationsSectionProps {
  invitations: readonly InvitationViewModel[]
  isLoading?: boolean
  errorMessage?: string
  onRevoke: (idInvitacion: number) => void
  onResend: (idInvitacion: number) => void
  /** The single invitation currently being revoked/resent, if any — only one action runs at a time. */
  pendingAction?: { idInvitacion: number; kind: 'revoke' | 'resend' }
}

/**
 * Real invitations (`GET /usuarios/invitaciones`) — a genuinely separate
 * concept from the waiter roster above it: an invited person has no
 * `Usuario` row yet (see `types/invitation.ts`), so this section never
 * merges into `WaiterList`.
 */
export function InvitationsSection({
  invitations,
  isLoading = false,
  errorMessage,
  onRevoke,
  onResend,
  pendingAction,
}: InvitationsSectionProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading id={headingId} className="text-subheading">
        Invitaciones
      </SectionHeading>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div
              role="status"
              aria-label="Cargando invitaciones"
              className="flex flex-col gap-3"
            >
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : errorMessage ? (
            <Alert tone="danger" title="No pudimos cargar las invitaciones">
              <p>{errorMessage}</p>
            </Alert>
          ) : invitations.length === 0 ? (
            <Text size="sm" className="text-muted-foreground">
              No hay invitaciones registradas.
            </Text>
          ) : (
            <ul aria-label="Invitaciones" className="flex flex-col gap-3">
              {invitations.map((invitation) => (
                <InvitationListItem
                  key={invitation.idInvitacion}
                  invitation={invitation}
                  onRevoke={onRevoke}
                  onResend={onResend}
                  isRevoking={
                    pendingAction?.kind === 'revoke' &&
                    pendingAction.idInvitacion === invitation.idInvitacion
                  }
                  isResending={
                    pendingAction?.kind === 'resend' &&
                    pendingAction.idInvitacion === invitation.idInvitacion
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
