import type { InvitationsListParams } from '@/features/waiters/services/invitationsApi'

export const invitationsQueryKeys = {
  all: ['invitaciones'] as const,
  lists: () => [...invitationsQueryKeys.all, 'lista'] as const,
  list: (params: InvitationsListParams) =>
    [...invitationsQueryKeys.lists(), params] as const,
}
