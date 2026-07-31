import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'

import { WaitersContent } from '@/features/waiters/components/WaitersContent'
import { WAITERS_FIXTURE } from '@/features/waiters/fixtures/waiterFixtures'
import {
  DEFAULT_WAITERS_FILTER_STATE,
  type WaitersFilterState,
} from '@/features/waiters/types/waiter'
import { filterWaiters } from '@/features/waiters/utils/filterWaiters'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /meseros. Entirely presentation-only: `WAITERS_FIXTURE` is
 * development/demo data, never a real backend response (see
 * features/waiters/fixtures). No development-state selector exists —
 * this page only ever shows the populated fixture list, or
 * `WaitersEmptyState` when the user's own filters happen to match zero
 * fixture waiters (a real, filter-driven outcome, not a simulated one).
 * `WaitersLoadingState`/`WaitersErrorState` remain fully implemented
 * and independently testable through `WaitersContent`'s own props.
 *
 * Neither `onSelectWaiter` nor `onInvite` is supplied here:
 * - No waiter-detail route is approved anywhere in
 *   docs/FrontendArchitecture.md §17 (not even as "Proposed"), so
 *   waiter rows render as non-interactive items (see `WaiterListItem`)
 *   rather than implying a selection action that goes nowhere.
 * - Inviting requires a genuinely unresolved recipient-field set
 *   (§8.2/§19 item 13), so the invite button renders genuinely disabled
 *   (see `WaitersPageHeader`) instead of showing a pending notice on
 *   click.
 */
export function WaitersPage() {
  const [filters, setFilters] = useState<WaitersFilterState>(DEFAULT_WAITERS_FILTER_STATE)

  const filteredWaiters = filterWaiters(WAITERS_FIXTURE, filters)

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          Los meseros mostrados son datos de desarrollo (
          <code>features/waiters/fixtures</code>), no información real.
        </Text>
      </Alert>

      <WaitersContent
        waiters={filteredWaiters}
        isLoading={false}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  )
}
