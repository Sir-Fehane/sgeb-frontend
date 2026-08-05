import { IconReportSearch } from '@tabler/icons-react'

import { Text } from '@/shared/components'

/**
 * A genuinely empty result (no waiter rows for the selected range) —
 * distinct from zero-valued metrics on an otherwise-populated row, which
 * are valid data, not emptiness.
 */
export function ReportsEmptyState() {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <IconReportSearch aria-hidden="true" className="text-muted-foreground size-10" />
      <Text size="sm" className="text-muted-foreground">
        No encontramos resultados para este periodo.
      </Text>
    </div>
  )
}
