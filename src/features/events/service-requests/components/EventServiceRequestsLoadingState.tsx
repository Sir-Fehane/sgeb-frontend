import { Skeleton } from '@/shared/components'

export function EventServiceRequestsLoadingState() {
  return (
    <div role="status" aria-label="Cargando solicitudes" className="flex flex-col gap-3">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
