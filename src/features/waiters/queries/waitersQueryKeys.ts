import type { WaitersListParams } from '@/features/waiters/services/waitersApi'

export const waitersQueryKeys = {
  all: ['meseros'] as const,
  lists: () => [...waitersQueryKeys.all, 'lista'] as const,
  list: (params: WaitersListParams) => [...waitersQueryKeys.lists(), params] as const,
}
