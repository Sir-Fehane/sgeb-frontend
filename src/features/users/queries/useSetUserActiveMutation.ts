import { useMutation, useQueryClient } from '@tanstack/react-query'

import { usersQueryKeys } from '@/features/users/queries/usersQueryKeys'
import { setUserActive } from '@/features/users/services/usersApi'
import type { UserViewModel } from '@/features/users/types/user'

/**
 * `PATCH /usuarios/{uuid}` `{activo}`. No optimistic update — a status
 * change cascades real server-side consequences (session/token revocation
 * on deactivation), so this waits for the confirmed response rather than
 * flipping the badge before the server has actually applied it (per this
 * branch's report: "avoid optimistic mutation for role/status changes if
 * backend confirmation is safer"). Invalidates the same query groups as
 * `useUpdateUserMutation`.
 */
export function useSetUserActiveMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuidUsuario, activo }: { uuidUsuario: string; activo: boolean }) =>
      setUserActive(uuidUsuario, activo),
    onSuccess: (user: UserViewModel) => {
      queryClient.setQueryData(usersQueryKeys.detail(user.uuidUsuario), user)
      void queryClient.invalidateQueries({ queryKey: usersQueryKeys.lists() })
    },
  })
}
