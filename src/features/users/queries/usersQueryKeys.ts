import type { UsersListParams } from '@/features/users/services/usersApi'

export const usersQueryKeys = {
  all: ['usuarios'] as const,
  lists: () => [...usersQueryKeys.all, 'lista'] as const,
  list: (params: UsersListParams) => [...usersQueryKeys.lists(), params] as const,
  details: () => [...usersQueryKeys.all, 'detalle'] as const,
  detail: (uuidUsuario: string) => [...usersQueryKeys.details(), uuidUsuario] as const,
}
