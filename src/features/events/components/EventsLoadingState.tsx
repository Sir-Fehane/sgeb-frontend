import { Skeleton } from '@/shared/components'

const PLACEHOLDER_ROWS = 4

/**
 * `role="status"` on the wrapper (not the individual `Skeleton`s, which
 * are `aria-hidden` by design) so assistive technology gets a single,
 * non-repetitive "loading" announcement.
 */
export function EventsLoadingState() {
  return (
    <div role="status" aria-label="Cargando eventos" className="flex flex-col gap-3">
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  )
}
