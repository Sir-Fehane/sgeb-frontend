import type { ReactNode } from 'react'

import { UserRoleBadge } from '@/features/users/components/UserRoleBadge'
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge'
import type { UserViewModel } from '@/features/users/types/user'
import { Caption } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface UserListItemProps {
  user: UserViewModel
  onSelect: (uuidUsuario: string) => void
}

const BASE_CLASSES = cn(
  'border-border bg-card flex w-full flex-col gap-2 rounded-lg border p-4 text-left',
  'md:grid md:grid-cols-[1.5fr_1.5fr_1fr_auto_auto] md:items-center md:gap-4',
)

const INTERACTIVE_CLASSES = cn(
  'hover:bg-accent',
  'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
)

/**
 * A single user row — always a focusable `<button>` (unlike
 * `WaiterListItem`, which can render non-interactively): every row here
 * opens `UserDetailDialog`, there is no "no detail route yet" case to
 * account for.
 */
export function UserListItem({ user, onSelect }: UserListItemProps) {
  const fields: ReactNode = (
    <>
      <span className="font-sans text-body-sm font-semibold">{user.nombreCompleto}</span>

      <span className="flex flex-col">
        <Caption>Correo</Caption>
        <span className="font-sans text-body-sm">{user.correo}</span>
      </span>

      <span className="flex flex-col">
        <Caption>Teléfono</Caption>
        <span className="font-sans text-body-sm">{user.telefono ?? 'No registrado'}</span>
      </span>

      <span>
        <UserRoleBadge rol={user.rol} />
      </span>

      <span>
        <UserStatusBadge estadoCuenta={user.estadoCuenta} />
      </span>
    </>
  )

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect(user.uuidUsuario)
        }}
        className={cn(BASE_CLASSES, INTERACTIVE_CLASSES)}
      >
        {fields}
      </button>
    </li>
  )
}
