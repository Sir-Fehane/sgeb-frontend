import { IconInfoCircle } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { ReportsContent } from '@/features/reports/components/ReportsContent'
import { WAITER_PERFORMANCE_REPORT_FIXTURE } from '@/features/reports/fixtures/reportFixtures'
import type { ReportFilterState } from '@/features/reports/types/report'
import { sortWaiterPerformanceReport } from '@/features/reports/utils/sortWaiterPerformanceReport'
import { Alert, Text } from '@/shared/components'

/**
 * A neutral development date range — NOT a claim about what the server
 * would default to. `GET /dashboard/meseros` documents no default range
 * (unlike `GET /dashboard/capitan`'s confirmed today/+30d), so this is
 * simply a fixed, fictional demo window.
 */
const DEVELOPMENT_FILTER_STATE: ReportFilterState = {
  fechaDesde: '2026-07-01',
  fechaHasta: '2026-07-31',
  orden: 'calificacion',
}

/**
 * Routed at /reportes. Entirely presentation-only:
 * `WAITER_PERFORMANCE_REPORT_FIXTURE` is development/demo data, never a
 * real `GET /dashboard/meseros` response (see features/reports/fixtures).
 * No development-state selector exists — this page only ever shows the
 * populated fixture, sorted locally by whichever `orden` value the user
 * picks (a stand-in for the server's real ordering, not a claim that
 * this is a live request). `ReportsLoadingState`/`ReportsErrorState`
 * remain fully implemented and independently testable through
 * `ReportsContent`'s own props.
 *
 * No `uuid_usuario` filter is offered (no approved waiter-selector
 * integration exists), and no pagination control exists (the response
 * documents no pagination metadata to build one against).
 */
export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilterState>(DEVELOPMENT_FILTER_STATE)

  const sortedItems = useMemo(
    () => sortWaiterPerformanceReport(WAITER_PERFORMANCE_REPORT_FIXTURE, filters.orden),
    [filters.orden],
  )

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          Los resultados mostrados son datos de desarrollo (
          <code>features/reports/fixtures</code>), no información real.
        </Text>
      </Alert>

      <ReportsContent
        items={sortedItems}
        isLoading={false}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  )
}
