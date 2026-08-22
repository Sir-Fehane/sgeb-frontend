import { Skeleton } from '@/shared/components'

const PLACEHOLDER_ROWS = 6

export function AuditLogLoadingState() {
  return (
    <div role="status" aria-label="Cargando bitácora" className="flex flex-col gap-3">
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}
