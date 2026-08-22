import { useMutation, useQueryClient } from '@tanstack/react-query'

import { usersQueryKeys } from '@/features/users/queries/usersQueryKeys'
import { updateUser } from '@/features/users/services/usersApi'
import type { UpdateUserRequest, UserViewModel } from '@/features/users/types/user'

/**
 * `PUT /usuarios/{uuid}`. No retry (TanStack Query's mutation default): a
 * lost success response to this real, non-idempotent-in-effect write must
 * never be silently retried. On success, both the affected detail entry and
 * every list are invalidated — the smallest correct pair of query groups
 * this mutation can affect (the row's `nombreCompleto` changes, so any
 * filtered list currently showing it needs a refetch too).
 */
export function useUpdateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      uuidUsuario,
      request,
    }: {
      uuidUsuario: string
      request: UpdateUserRequest
    }) => updateUser(uuidUsuario, request),
    onSuccess: (user: UserViewModel) => {
      queryClient.setQueryData(usersQueryKeys.detail(user.uuidUsuario), user)
      void queryClient.invalidateQueries({ queryKey: usersQueryKeys.lists() })
    },
  })
}
