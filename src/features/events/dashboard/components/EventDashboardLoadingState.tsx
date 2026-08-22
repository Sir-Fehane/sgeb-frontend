import { Skeleton } from '@/shared/components'

const PLACEHOLDER_SECTIONS = 7

export function EventDashboardLoadingState() {
  return (
    <div
      role="status"
      aria-label="Cargando resumen operativo"
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-16 w-full max-w-md" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_SECTIONS }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    </div>
  )
}
