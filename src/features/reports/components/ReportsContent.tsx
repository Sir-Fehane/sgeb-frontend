import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'
import { ReportsErrorState } from '@/features/reports/components/ReportsErrorState'
import { ReportsEventPicker } from '@/features/reports/components/ReportsEventPicker'
import { ReportsLoadingState } from '@/features/reports/components/ReportsLoadingState'
import { ReportsMermaSummarySection } from '@/features/reports/components/ReportsMermaSummarySection'
import { ReportsPageHeader } from '@/features/reports/components/ReportsPageHeader'
import { ReportsPaymentsLinkSection } from '@/features/reports/components/ReportsPaymentsLinkSection'
import { ReportsPerformanceDeferredSection } from '@/features/reports/components/ReportsPerformanceDeferredSection'
import { ReportsRatingsSection } from '@/features/reports/components/ReportsRatingsSection'
import type {
  EventMermaSummaryViewModel,
  EventRatingsSummaryViewModel,
} from '@/features/reports/types/report'
import type { EventListItemViewModel } from '@/features/events/types/event'
import { formatEventDate } from '@/features/events/utils/eventDetailFormatting'
import { Alert, Caption, SectionHeading, Separator, Text } from '@/shared/components'

export interface ReportsContentProps {
  events: readonly EventListItemViewModel[]
  isLoadingEvents: boolean
  eventsErrorMessage?: string | undefined
  onRetryEvents: () => void

  idEvento: number | null
  onEventoChange: (idEvento: number | null) => void

  canViewRatings: boolean

  mermaSummary: EventMermaSummaryViewModel | null
  isLoadingMerma: boolean
  mermaErrorMessage?: string | undefined
  onRetryMerma: () => void

  ratingsSummary: EventRatingsSummaryViewModel | null
  soloBajas: boolean
  onSoloBajasChange: (soloBajas: boolean) => void
  isLoadingRatings: boolean
  ratingsErrorMessage?: string | undefined
  onRetryRatings: () => void
}

/**
 * The presentational reports-page composition — two clearly separated
 * information-architecture groups, per this branch's own audit finding
 * that the page previously mixed two unrelated scopes:
 *
 * 1. "Reportes por evento" — event picker + Merma/Calificaciones/Pagos,
 *    all genuinely scoped to whichever event is selected.
 * 2. "Histórico de personal" — the deferred waiter-performance card,
 *    which is NOT event-scoped at all (it is a future cross-event,
 *    date-range report by mesero) and must never visually read as if the
 *    event picker above also filters it. The two groups are separated by
 *    a real `<Separator />` and each owns its own `<h2>` (`SectionHeading`),
 *    and the deferred card is placed in its own `<section>` entirely
 *    outside the event-scoped one — not merely styled differently while
 *    sharing a container.
 *
 * Every event-scoped card is independently loading/error-scoped — a
 * failed merma fetch never blanks the ratings card, and vice versa, same
 * "one failed part doesn't take down the whole screen" principle the
 * event dashboard's SGEB-0004 handling uses for a different reason.
 */
export function ReportsContent({
  events,
  isLoadingEvents,
  eventsErrorMessage,
  onRetryEvents,
  idEvento,
  onEventoChange,
  canViewRatings,
  mermaSummary,
  isLoadingMerma,
  mermaErrorMessage,
  onRetryMerma,
  ratingsSummary,
  soloBajas,
  onSoloBajasChange,
  isLoadingRatings,
  ratingsErrorMessage,
  onRetryRatings,
}: ReportsContentProps) {
  const selectedEvent = events.find((evento) => evento.idEvento === idEvento) ?? null

  return (
    <div className="flex flex-col gap-8">
      <ReportsPageHeader />

      <section
        aria-labelledby="reports-event-scope-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <SectionHeading id="reports-event-scope-heading" className="text-heading">
            Reportes por evento
          </SectionHeading>
          <Text size="sm" className="text-muted-foreground">
            Selecciona un evento para ver su merma, calificaciones y pagos.
          </Text>
        </div>

        {isLoadingEvents ? (
          <ReportsLoadingState />
        ) : eventsErrorMessage ? (
          <ReportsErrorState errorMessage={eventsErrorMessage} onRetry={onRetryEvents} />
        ) : events.length === 0 ? (
          <ReportsEmptyState message="Aún no hay eventos para reportar." />
        ) : (
          <>
            <ReportsEventPicker
              events={events}
              idEvento={idEvento}
              onChange={onEventoChange}
            />

            {idEvento === null ? (
              <ReportsEmptyState message="Selecciona un evento para ver sus reportes." />
            ) : (
              <div className="flex flex-col gap-4">
                {selectedEvent ? (
                  <Caption>
                    Mostrando reportes de: {selectedEvent.titulo} ·{' '}
                    {formatEventDate(selectedEvent.fecha)}
                  </Caption>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ReportsMermaSummarySection
                    idEvento={idEvento}
                    summary={mermaSummary}
                    isLoading={isLoadingMerma}
                    {...(mermaErrorMessage ? { errorMessage: mermaErrorMessage } : {})}
                    onRetry={onRetryMerma}
                  />

                  {canViewRatings ? (
                    <ReportsRatingsSection
                      summary={ratingsSummary}
                      soloBajas={soloBajas}
                      onSoloBajasChange={onSoloBajasChange}
                      isLoading={isLoadingRatings}
                      {...(ratingsErrorMessage
                        ? { errorMessage: ratingsErrorMessage }
                        : {})}
                      onRetry={onRetryRatings}
                    />
                  ) : (
                    <Alert tone="neutral" title="Calificaciones">
                      <p>Esta sección es para capitanes y administradores.</p>
                    </Alert>
                  )}

                  <ReportsPaymentsLinkSection idEvento={idEvento} />
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Separator />

      <section
        aria-labelledby="reports-personnel-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <SectionHeading id="reports-personnel-heading" className="text-heading">
            Histórico de personal
          </SectionHeading>
          <Text size="sm" className="text-muted-foreground">
            Reportes por mesero a lo largo del tiempo — independientes del evento
            seleccionado arriba.
          </Text>
        </div>

        <ReportsPerformanceDeferredSection />
      </section>
    </div>
  )
}
