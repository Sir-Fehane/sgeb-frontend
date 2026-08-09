import { Skeleton } from '@/shared/components'

/**
 * `role="status"` on the wrapper (not the individual `Skeleton`s, which
 * are `aria-hidden` by design) so assistive technology gets a single,
 * non-repetitive "loading" announcement — same pattern as
 * `EventDetailLoadingState`/`TeamSelectionLoadingState`.
 */
export function EventAttendanceLoadingState() {
  return (
    <div
      role="status"
      aria-label="Cargando pase de lista"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
