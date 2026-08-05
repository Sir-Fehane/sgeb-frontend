import type { DashboardRange } from '@/features/dashboard/types/dashboard'
import {
  formatDashboardDate,
  formatDashboardDateTime,
} from '@/features/dashboard/utils/dashboardFormatting'
import { Caption, Text } from '@/shared/components'

export interface CaptainDashboardHeaderProps {
  /** `DashboardCapitan.generado_en` — when the snapshot was generated, not "now". */
  generadoEn: string
  /**
   * `DashboardCapitan.rango` — the date range the *response* was actually
   * computed for. Always comes from the dashboard data, never from the
   * user's currently-edited filter inputs (`DashboardDateFilterState`),
   * which may differ from what the last successful response covered.
   */
  rango: DashboardRange
}

/**
 * No `<h1>` here — `AppShell`'s `Topbar` already renders "Panel" as the
 * page title (same convention as `EventsPageHeader`/`WaitersPageHeader`).
 * Both lines are secondary metadata (`Caption`), not primary content —
 * this is not a card/section, and there's no live updating or
 * freshness threshold, just the two documented response fields.
 */
export function CaptainDashboardHeader({
  generadoEn,
  rango,
}: CaptainDashboardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <Text size="sm" className="text-muted-foreground">
        Resumen operativo de tus eventos como capitán.
      </Text>
      <div className="flex flex-col items-end">
        <Caption>
          Periodo consultado: {formatDashboardDate(rango.fechaDesde)} –{' '}
          {formatDashboardDate(rango.fechaHasta)}
        </Caption>
        <Caption>Datos generados: {formatDashboardDateTime(generadoEn)}</Caption>
      </div>
    </div>
  )
}
