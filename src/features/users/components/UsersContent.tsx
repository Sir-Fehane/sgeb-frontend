import { UserList } from '@/features/users/components/UserList'
import { UsersEmptyState } from '@/features/users/components/UsersEmptyState'
import { UsersErrorState } from '@/features/users/components/UsersErrorState'
import { UsersFilters } from '@/features/users/components/UsersFilters'
import { UsersLoadingState } from '@/features/users/components/UsersLoadingState'
import { UsersPageHeader } from '@/features/users/components/UsersPageHeader'
import type { UsersFilterState, UserViewModel } from '@/features/users/types/user'

export interface UsersContentProps {
  users: readonly UserViewModel[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filters: UsersFilterState
  onFilterChange: (filters: UsersFilterState) => void
  onSelectUser: (uuidUsuario: string) => void
}

/**
 * The presentational users-directory composition: header + filters +
 * exactly one of the four states (loading / error / empty / populated
 * list). `UsersPage` wires `useUsersQuery` into these props — same split
 * `WaitersContent` establishes for the waiters roster.
 */
export function UsersContent({
  users,
  isLoading = false,
  errorMessage,
  onRetry,
  filters,
  onFilterChange,
  onSelectUser,
}: UsersContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <UsersPageHeader />
      <UsersFilters filters={filters} onFilterChange={onFilterChange} />

      {isLoading ? (
        <UsersLoadingState />
      ) : errorMessage ? (
        <UsersErrorState errorMessage={errorMessage} onRetry={onRetry} />
      ) : users.length === 0 ? (
        <UsersEmptyState />
      ) : (
        <UserList users={users} onSelectUser={onSelectUser} />
      )}
    </div>
  )
}
