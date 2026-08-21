import { Badge, Card, CardContent, CardHeading, Text } from '@/shared/components'

/**
 * Honest deferred state — no backend endpoint answering "waiter
 * performance" (a paginated, filterable, historical, cross-event
 * aggregate keyed by mesero, not by evento) exists at the pinned backend
 * SHA (see `types/report.ts`'s module comment). Deliberately styled
 * subordinate to the real "Reportes por evento" cards above it —
 * `bg-muted/40` + muted heading — the same visual demotion
 * `EventDetailRoadmapSection` already uses for a genuinely not-yet-available
 * roadmap item, so a "Próximamente" capability reads consistently across
 * the app instead of looking like an equally-real report.
 */
export function ReportsPerformanceDeferredSection() {
  return (
    <section
      aria-labelledby="reports-performance-heading"
      className="flex flex-col gap-3"
    >
      <Card className="bg-muted/40">
        <CardContent className="flex flex-col gap-2 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <CardHeading
              id="reports-performance-heading"
              className="text-muted-foreground"
            >
              Desempeño de meseros
            </CardHeading>
            <Badge tone="neutral">Próximamente</Badge>
          </div>
          <Text size="sm" className="text-muted-foreground">
            Histórico por periodo de asistencia, calificaciones y pagos por mesero.
          </Text>
        </CardContent>
      </Card>
    </section>
  )
}
