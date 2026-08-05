import { Skeleton } from '@/shared/components'

const PLACEHOLDER_SECTIONS = 6

/**
 * `role="status"` on the wrapper (not the individual `Skeleton`s, which
 * are `aria-hidden` by design) so assistive technology gets a single,
 * non-repetitive "loading" announcement — mirrors `WaitersLoadingState`.
 */
export function DashboardLoadingState() {
  return (
    <div
      role="status"
      aria-label="Cargando panel del capitán"
      className="flex flex-col gap-4"
    >
      {Array.from({ length: PLACEHOLDER_SECTIONS }, (_, index) => (
        <Skeleton key={index} className="h-32 w-full" />
      ))}
    </div>
  )
}
