import { useMutation, useQueryClient } from '@tanstack/react-query'

import { invitationsQueryKeys } from '@/features/waiters/queries/invitationsQueryKeys'
import { createInvitation } from '@/features/waiters/services/invitationsApi'
import type { CreateInvitationRequest } from '@/features/waiters/types/invitation'

/**
 * `POST /usuarios/invitaciones`. No retry (TanStack Query's mutation
 * default): a lost success response to this real, non-idempotent creation
 * must never be silently retried — a second attempt would hit `SSO-4001`
 * ("ya existe una invitación pendiente para ese correo"), same reasoning
 * `useCreateSalonMutation` already documents. Invalidates the invitations
 * list so the new pending invitation appears without a manual refresh.
 */
export function useCreateInvitationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateInvitationRequest) => createInvitation(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsQueryKeys.lists() })
    },
  })
}
