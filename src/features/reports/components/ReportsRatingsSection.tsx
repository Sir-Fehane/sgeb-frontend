import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'
import { ReportsErrorState } from '@/features/reports/components/ReportsErrorState'
import type { EventRatingsSummaryViewModel } from '@/features/reports/types/report'
import {
  formatReportDateTime,
  formatReportRating,
} from '@/features/reports/utils/reportFormatting'
import { Card, CardContent, CardHeading, Skeleton, Text } from '@/shared/components'

export interface ReportsRatingsSectionProps {
  summary: EventRatingsSummaryViewModel | null
  soloBajas: boolean
  onSoloBajasChange: (soloBajas: boolean) => void
  isLoading: boolean
  errorMessage?: string | undefined
  onRetry: () => void
}

/**
 * Diner ratings for the currently selected event (see the shared
 * "Mostrando reportes de" context line `ReportsContent` renders above this
 * card — every number here is scoped to that one event) —
 * `GET /eventos/{id}/calificaciones`, capitán/admin only. `soloBajas`
 * mirrors the backend's own real documented use for this filter
 * ("nadie revisa una lista de cincos" — nobody reviews a list of fives):
 * surfacing the low ratings worth acting on, sent as a real
 * `puntuacion_max` server-side filter, never simulated client-side.
 * `idParticipacion` is rendered as a bare numeric reference — no
 * waiter-directory integration exists here to resolve it to a name (see
 * `services/reportsApi.ts`'s module comment).
 */
export function ReportsRatingsSection({
  summary,
  soloBajas,
  onSoloBajasChange,
  isLoading,
  errorMessage,
  onRetry,
}: ReportsRatingsSectionProps) {
  return (
    <section aria-labelledby="reports-ratings-heading" className="flex flex-col gap-3">
      <CardHeading id="reports-ratings-heading">Calificaciones</CardHeading>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <label className="text-body-sm text-foreground flex w-fit items-center gap-2 font-sans">
            <input
              type="checkbox"
              checked={soloBajas}
              className="border-input size-4 rounded"
              onChange={(event) => {
                onSoloBajasChange(event.target.checked)
              }}
            />
            Solo calificaciones bajas (2 o menos)
          </label>

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : errorMessage ? (
            <ReportsErrorState errorMessage={errorMessage} onRetry={onRetry} />
          ) : summary ? (
            <div className="flex flex-col gap-3">
              <Text size="sm">
                {summary.total} calificación(es) · Promedio:{' '}
                {formatReportRating(summary.promedio)}
              </Text>
              {summary.calificaciones.length === 0 ? (
                <ReportsEmptyState message="No hay calificaciones para mostrar." />
              ) : (
                <ul aria-label="Calificaciones" className="flex flex-col gap-2">
                  {summary.calificaciones.map((rating) => (
                    <li
                      key={rating.idCalificacion}
                      className="border-border flex flex-col gap-1 rounded-lg border p-3"
                    >
                      <Text size="sm" className="font-medium">
                        Mesa {rating.idMesa} · {formatReportRating(rating.puntuacion)} ·{' '}
                        {formatReportDateTime(rating.creadaEn)}
                      </Text>
                      {rating.comentario ? (
                        <Text size="sm">{rating.comentario}</Text>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
