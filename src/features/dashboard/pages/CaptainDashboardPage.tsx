import { CaptainDashboardContent } from '@/features/dashboard/components/CaptainDashboardContent'
import { useCaptainDashboardQuery } from '@/features/dashboard/queries/useCaptainDashboardQuery'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — mirrors `EventsPage`'s
 * `toSafeErrorMessage`.
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar el panel.'
}

/**
 * Routed at /panel. Live `GET /dashboard/capitan` wiring around
 * `CaptainDashboardContent` — replaces the previous fixture-backed
 * foundation (`CAPTAIN_DASHBOARD_FIXTURE`) entirely; see this branch's
 * report for why the dashboard was rebuilt around a materially different,
 * simpler shape than the one the fixture/types previously assumed.
 */
export function CaptainDashboardPage() {
  const dashboardQuery = useCaptainDashboardQuery()

  return (
    <div className="flex flex-col gap-6">
      <CaptainDashboardContent
        {...(dashboardQuery.data ? { dashboard: dashboardQuery.data } : {})}
        isLoading={dashboardQuery.isPending}
        {...(dashboardQuery.error
          ? { errorMessage: toSafeErrorMessage(dashboardQuery.error) }
          : {})}
        onRetry={() => void dashboardQuery.refetch()}
      />
    </div>
  )
}
