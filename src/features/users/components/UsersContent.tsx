import { UserList } from '@/features/users/components/UserList'
import { UsersEmptyState } from '@/features/users/components/UsersEmptyState'
import { UsersErrorState } from '@/features/users/components/UsersErrorState'
import { UsersFilters } from '@/features/users/components/UsersFilters'
import { UsersForbiddenState } from '@/features/users/components/UsersForbiddenState'
import { UsersLoadingState } from '@/features/users/components/UsersLoadingState'
import { UsersPageHeader } from '@/features/users/components/UsersPageHeader'
import type { UsersFilterState, UserViewModel } from '@/features/users/types/user'

export interface UsersContentProps {
  canView: boolean
  users: readonly UserViewModel[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filters: UsersFilterState
  onFilterChange: (filters: UsersFilterState) => void
  onSelectUser: (uuidUsuario: string) => void
  canInviteStaff?: boolean
  onInviteStaff?: () => void
  isInviteStaffDisabled?: boolean
}

/**
 * The presentational users-directory composition: header + filters +
 * exactly one of the four states (loading / error / empty / populated
 * list). `UsersPage` wires `useUsersQuery` into these props — same split
 * `WaitersContent` establishes for the waiters roster. `canView` gates
 * everything below behind `UsersForbiddenState` for a non-admin session
 * reaching `/usuarios` directly by URL — same pattern `AuditLogContent`'s
 * `canView` already establishes for `/bitacora`.
 */
export function UsersContent({
  canView,
  users,
  isLoading = false,
  errorMessage,
  onRetry,
  filters,
  onFilterChange,
  onSelectUser,
  canInviteStaff,
  onInviteStaff,
  isInviteStaffDisabled,
}: UsersContentProps) {
  if (!canView) {
    return (
      <div className="flex flex-col gap-6">
        <UsersForbiddenState />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <UsersPageHeader
        {...(canInviteStaff === undefined ? {} : { canInviteStaff })}
        {...(onInviteStaff ? { onInviteStaff } : {})}
        {...(isInviteStaffDisabled === undefined ? {} : { isInviteStaffDisabled })}
      />
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
