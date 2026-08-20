import { useMutation, useQueryClient } from '@tanstack/react-query'

import { invitationsQueryKeys } from '@/features/waiters/queries/invitationsQueryKeys'
import { resendInvitation } from '@/features/waiters/services/invitationsApi'

/**
 * `POST /usuarios/invitaciones/{id}/reenviar`. No retry: a lost success
 * response must never be silently replayed — the server already revoked
 * the previous invitation and issued a new token as a side effect
 * (`InvitacionService.reenviar`), so a blind retry would revoke the just-
 * created one and issue yet another. Invalidates the invitations list; the
 * caller is responsible for capturing the returned one-time deeplink
 * (`mutation.data`) before it disappears.
 */
export function useResendInvitationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (idInvitacion: number) => resendInvitation(idInvitacion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsQueryKeys.lists() })
    },
  })
}
