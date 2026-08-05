import { CaptainDashboardHeader } from '@/features/dashboard/components/CaptainDashboardHeader'
import { ClosingSummarySection } from '@/features/dashboard/components/ClosingSummarySection'
import { CurrentOperationSection } from '@/features/dashboard/components/CurrentOperationSection'
import { DashboardDateRangeFilters } from '@/features/dashboard/components/DashboardDateRangeFilters'
import { DashboardErrorState } from '@/features/dashboard/components/DashboardErrorState'
import { DashboardLoadingState } from '@/features/dashboard/components/DashboardLoadingState'
import { DashboardPartialWarning } from '@/features/dashboard/components/DashboardPartialWarning'
import { DashboardSummarySection } from '@/features/dashboard/components/DashboardSummarySection'
import { OperationalAlertsSection } from '@/features/dashboard/components/OperationalAlertsSection'
import { StaffingRiskSection } from '@/features/dashboard/components/StaffingRiskSection'
import { UpcomingEventsSection } from '@/features/dashboard/components/UpcomingEventsSection'
import type {
  CaptainDashboardViewModel,
  DashboardDateFilterState,
} from '@/features/dashboard/types/dashboard'

export interface CaptainDashboardContentProps {
  dashboard: CaptainDashboardViewModel
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  /** `result.code === 'SGEB-0004'` — some sections are `null` because they failed, not because they were excluded. */
  isPartial?: boolean
  filters: DashboardDateFilterState
  onFilterChange: (filters: DashboardDateFilterState) => void
  /** Omit to render every upcoming-event row as a non-interactive item — see `UpcomingEventItem`. */
  onSelectEvent?: (id: string) => void
  /** Omit to render a genuinely disabled "Invitar meseros" button — see `StaffingRiskSection`. */
  onInviteWaiters?: () => void
}

/**
 * The presentational captain-dashboard composition: header + date
 * filters + exactly one of (loading skeleton / global error / the 6
 * sections), selected purely from props — mirrors `EventsContent`'s and
 * `WaitersContent`'s architecture. `CaptainDashboardPage` is a thin,
 * fixture-backed wiring layer around it (`isLoading={false}`, no
 * `errorMessage`, no `isPartial`); real API integration wires TanStack
 * Query state into those same props without needing to change this
 * component.
 *
 * `isLoading`/`errorMessage` replace the *entire* body (no stale
 * section content beneath a global error or spinner). `isPartial`
 * instead renders every section as normal — each null section already
 * renders its own "No disponible" via `DashboardSectionUnavailable` —
 * with an additional non-interrupting warning banner above them.
 */
export function CaptainDashboardContent({
  dashboard,
  isLoading = false,
  errorMessage,
  onRetry,
  isPartial = false,
  filters,
  onFilterChange,
  onSelectEvent,
  onInviteWaiters,
}: CaptainDashboardContentProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardDateRangeFilters filters={filters} onFilterChange={onFilterChange} />
        <DashboardLoadingState />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardDateRangeFilters filters={filters} onFilterChange={onFilterChange} />
        <DashboardErrorState errorMessage={errorMessage} onRetry={onRetry} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <CaptainDashboardHeader generadoEn={dashboard.generadoEn} rango={dashboard.rango} />
      <DashboardDateRangeFilters filters={filters} onFilterChange={onFilterChange} />
      {isPartial ? <DashboardPartialWarning /> : null}

      <DashboardSummarySection resumen={dashboard.resumen} />
      <UpcomingEventsSection
        proximosEventos={dashboard.proximosEventos}
        onSelectEvent={onSelectEvent}
      />
      <StaffingRiskSection
        staffingRiesgo={dashboard.staffingRiesgo}
        onInviteWaiters={onInviteWaiters}
      />
      <CurrentOperationSection operacion={dashboard.operacion} />
      <ClosingSummarySection cierre={dashboard.cierre} />
      <OperationalAlertsSection alertas={dashboard.alertas} />
    </div>
  )
}
