import { useMutation, useQueryClient } from '@tanstack/react-query'

import { invitationsQueryKeys } from '@/features/waiters/queries/invitationsQueryKeys'
import { revokeInvitation } from '@/features/waiters/services/invitationsApi'

/** `DELETE /usuarios/invitaciones/{id}`. Server-side idempotent on an already-revoked invitation, so no client-side duplicate-submit guard beyond the caller disabling the button while `isPending`. */
export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (idInvitacion: number) => revokeInvitation(idInvitacion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsQueryKeys.lists() })
    },
  })
}
