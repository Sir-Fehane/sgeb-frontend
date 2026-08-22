import { useEffect, useState } from 'react'

import { UserDetailDialog } from '@/features/users/components/UserDetailDialog'
import { UsersContent } from '@/features/users/components/UsersContent'
import { useUsersQuery } from '@/features/users/queries/useUsersQuery'
import {
  DEFAULT_USERS_FILTER_STATE,
  type UsersFilterState,
} from '@/features/users/types/user'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

const SEARCH_DEBOUNCE_MS = 300

function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return fallback
}

/**
 * Routed at /usuarios (capitán+admin — `GET /usuarios`'s
 * `middleware.rol(['capitan', 'admin'])`; hidden from a `mesero` session
 * in `NAV_ITEMS`, though `mesero` never opens this web app anyway). The
 * general account directory across all three roles — distinct from
 * `/meseros` (`WaitersPage`), which stays the specialized mesero-recruitment
 * + invitation screen and is not merged into or duplicated by this page.
 */
export function UsersPage() {
  const [filters, setFilters] = useState<UsersFilterState>(DEFAULT_USERS_FILTER_STATE)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [filters.search])

  const usersQuery = useUsersQuery({ ...filters, search: debouncedSearch })
  const session = useOidcSessionStore((state) => state.session)
  const currentUserUuid =
    session.status === 'authenticated' ? session.user.sub : undefined

  return (
    <>
      <UsersContent
        users={usersQuery.data ?? []}
        isLoading={usersQuery.isPending}
        {...(usersQuery.error
          ? {
              errorMessage: toSafeErrorMessage(
                usersQuery.error,
                'Ocurrió un error inesperado al cargar los usuarios.',
              ),
            }
          : {})}
        onRetry={() => void usersQuery.refetch()}
        filters={filters}
        onFilterChange={setFilters}
        onSelectUser={setSelectedUuid}
      />

      {selectedUuid ? (
        <UserDetailDialog
          uuidUsuario={selectedUuid}
          currentUserUuid={currentUserUuid}
          onClose={() => {
            setSelectedUuid(null)
          }}
        />
      ) : null}
    </>
  )
}
