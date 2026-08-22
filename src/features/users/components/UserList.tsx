import { UserListItem } from '@/features/users/components/UserListItem'
import type { UserViewModel } from '@/features/users/types/user'

export interface UserListProps {
  users: readonly UserViewModel[]
  onSelectUser: (uuidUsuario: string) => void
}

export function UserList({ users, onSelectUser }: UserListProps) {
  return (
    <ul aria-label="Usuarios" className="flex flex-col gap-3">
      {users.map((user) => (
        <UserListItem key={user.uuidUsuario} user={user} onSelect={onSelectUser} />
      ))}
    </ul>
  )
}
