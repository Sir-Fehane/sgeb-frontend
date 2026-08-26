import { useQuery } from '@tanstack/react-query'

import { checklistsQueryKeys } from '@/features/checklists/queries/checklistsQueryKeys'
import { fetchChecklists } from '@/features/checklists/services/checklistsApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** `GET /checklists`, unfiltered (both active and inactive, every tipo) — the catalog screen filters/labels client-side so a captain can find and reactivate a deactivated template without a second screen, mirroring `useInsumosQuery`. */
export function useChecklistsQuery() {
  return useQuery({
    queryKey: checklistsQueryKeys.list(),
    queryFn: ({ signal }) => fetchChecklists({}, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
