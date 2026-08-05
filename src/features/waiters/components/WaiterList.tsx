import { WaiterListItem } from '@/features/waiters/components/WaiterListItem'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

export interface WaiterListProps {
  waiters: readonly WaiterListItemViewModel[]
  onSelectWaiter?: ((id: string) => void) | undefined
}

export function WaiterList({ waiters, onSelectWaiter }: WaiterListProps) {
  return (
    <ul aria-label="Meseros" className="flex flex-col gap-3">
      {waiters.map((waiter) => (
        <WaiterListItem key={waiter.id} waiter={waiter} onSelect={onSelectWaiter} />
      ))}
    </ul>
  )
}
