import { Skeleton } from '@/shared/components'

const PLACEHOLDER_ROWS = 5

export function UsersLoadingState() {
  return (
    <div role="status" aria-label="Cargando usuarios" className="flex flex-col gap-3">
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  )
}
