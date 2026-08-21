import { IconReportSearch } from '@tabler/icons-react'

import { Text } from '@/shared/components'

export interface ReportsEmptyStateProps {
  /** Defaults to a generic "no results" message; callers with a more specific empty case (e.g. no events yet, no ratings yet) pass their own copy. */
  message?: string
}

/**
 * A genuinely empty result — distinct from a zero-valued metric on
 * otherwise-real data (e.g. `promedio: 0`, a valid rating), which is
 * never routed through this component.
 */
export function ReportsEmptyState({
  message = 'No encontramos resultados.',
}: ReportsEmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <IconReportSearch aria-hidden="true" className="text-muted-foreground size-10" />
      <Text size="sm" className="text-muted-foreground">
        {message}
      </Text>
    </div>
  )
}
