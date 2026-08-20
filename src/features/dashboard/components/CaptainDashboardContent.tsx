import { CaptainDashboardTotals } from '@/features/dashboard/components/CaptainDashboardTotals'
import { DashboardErrorState } from '@/features/dashboard/components/DashboardErrorState'
import { DashboardEventListSection } from '@/features/dashboard/components/DashboardEventListSection'
import { DashboardLoadingState } from '@/features/dashboard/components/DashboardLoadingState'
import type { CaptainDashboardViewModel } from '@/features/dashboard/types/dashboard'

export interface CaptainDashboardContentProps {
  dashboard?: CaptainDashboardViewModel
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
}

/**
 * The presentational captain-dashboard composition: exactly one of
 * (loading skeleton / global error / the real portfolio sections),
 * selected purely from props — mirrors `WaitersContent`'s architecture.
 * `CaptainDashboardPage` wires `useCaptainDashboardQuery` into these same
 * props.
 *
 * Only three sections, all real `GET /dashboard/capitan` fields: "En
 * curso," "Próximos eventos," and "Por cerrar" — plus the totals strip
 * (which also surfaces `borradores`, a count with no event list of its
 * own). No loading/error split per-section and no partial-success banner:
 * the real endpoint returns everything in one response with no `null`
 * sections (see `types/dashboard.ts`).
 */
export function CaptainDashboardContent({
  dashboard,
  isLoading = false,
  errorMessage,
  onRetry,
}: CaptainDashboardContentProps) {
  if (isLoading) {
    return <DashboardLoadingState />
  }

  if (errorMessage) {
    return <DashboardErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!dashboard) {
    // Never observed in practice — `CaptainDashboardPage` only omits both
    // `isLoading` and `errorMessage` once `dashboardQuery.data` exists —
    // guarded defensively rather than assumed.
    return <DashboardLoadingState />
  }

  return (
    <div className="flex flex-col gap-6">
      <CaptainDashboardTotals
        totales={dashboard.totales}
        borradores={dashboard.borradores}
      />
      <DashboardEventListSection
        title="En curso"
        events={dashboard.enCurso}
        emptyMessage="No tienes eventos en curso en este momento."
      />
      <DashboardEventListSection
        title="Próximos eventos"
        events={dashboard.proximos}
        emptyMessage="No hay próximos eventos publicados."
      />
      <DashboardEventListSection
        title="Por cerrar"
        events={dashboard.porCerrar}
        emptyMessage="No hay eventos finalizados pendientes de cierre."
      />
    </div>
  )
}
