import { Text } from '@/shared/components'

/**
 * No heading is rendered here — `AppShell`'s `Topbar` already renders
 * "Reportes" as the page's `<h1>` (same convention as
 * `EventsPageHeader`/`WaitersPageHeader`). The subtitle below is the
 * honest scope statement for this screen: historical waiter performance
 * only, backed by the single `GET /dashboard/meseros` contract — not a
 * general system report center, financial audit, event report, or
 * merma report.
 */
export function ReportsPageHeader() {
  return (
    <Text size="sm" className="text-muted-foreground">
      Desempeño histórico de meseros: asistencia, calificaciones y pagos por periodo.
    </Text>
  )
}
