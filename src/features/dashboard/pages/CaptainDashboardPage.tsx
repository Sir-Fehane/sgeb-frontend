import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'

import { CaptainDashboardContent } from '@/features/dashboard/components/CaptainDashboardContent'
import { CAPTAIN_DASHBOARD_FIXTURE } from '@/features/dashboard/fixtures/dashboardFixtures'
import type { DashboardDateFilterState } from '@/features/dashboard/types/dashboard'
import { getDefaultDashboardDateFilterState } from '@/features/dashboard/utils/dashboardDateRange'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /panel. Entirely presentation-only: `CAPTAIN_DASHBOARD_FIXTURE`
 * is development/demo data (see features/dashboard/fixtures), never a
 * real `GET /dashboard/capitan` response. No development-state selector
 * exists — this page only ever shows the populated fixture.
 * `DashboardLoadingState`/`DashboardErrorState`/the SGEB-0004 partial
 * warning remain fully implemented and independently testable through
 * `CaptainDashboardContent`'s own props.
 *
 * Neither `onSelectEvent` nor `onInviteWaiters` is supplied here: no
 * event-detail route is approved (upcoming-event rows render as
 * non-interactive items — see `UpcomingEventItem`), and the waiter-
 * invitation contract remains unresolved (the "Invitar meseros" button
 * renders genuinely disabled — see `StaffingRiskSection`).
 */
export function CaptainDashboardPage() {
  const [filters, setFilters] = useState<DashboardDateFilterState>(
    getDefaultDashboardDateFilterState(),
  )

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          El panel mostrado usa datos de desarrollo (
          <code>features/dashboard/fixtures</code>), no información real.
        </Text>
      </Alert>

      <CaptainDashboardContent
        dashboard={CAPTAIN_DASHBOARD_FIXTURE}
        isLoading={false}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  )
}
