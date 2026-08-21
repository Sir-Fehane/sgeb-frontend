import { Text } from '@/shared/components'

/**
 * No heading is rendered here — `AppShell`'s `Topbar` already renders
 * "Reportes" as the page's `<h1>` (same convention as
 * `EventsPageHeader`/`WaitersPageHeader`). This subtitle only orients the
 * reader to the page's two independent scopes — the per-event group below
 * carries its own description of what it covers, and so does the
 * personnel group, so this line stays short and never repeats either.
 */
export function ReportsPageHeader() {
  return (
    <Text size="sm" className="text-muted-foreground">
      Reportes reales del sistema, organizados por evento y, por separado, por personal.
    </Text>
  )
}
