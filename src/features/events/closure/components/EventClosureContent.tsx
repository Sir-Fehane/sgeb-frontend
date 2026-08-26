import { Link } from 'react-router-dom'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import { EventClosureCleanupSection } from '@/features/events/closure/components/EventClosureCleanupSection'
import { EventClosureErrorState } from '@/features/events/closure/components/EventClosureErrorState'
import { EventClosureFinalizeSection } from '@/features/events/closure/components/EventClosureFinalizeSection'
import { EventClosureHeader } from '@/features/events/closure/components/EventClosureHeader'
import { EventClosureLoadingState } from '@/features/events/closure/components/EventClosureLoadingState'
import { EventClosureReadinessSection } from '@/features/events/closure/components/EventClosureReadinessSection'
import { EventClosureWasteForm } from '@/features/events/closure/components/EventClosureWasteForm'
import { EventClosureWasteReportsSection } from '@/features/events/closure/components/EventClosureWasteReportsSection'
import type { CreateWasteReportFormValues } from '@/features/events/closure/schemas/wasteReportSchema'
import type {
  EventClosureReadinessViewModel,
  MermaReportViewModel,
} from '@/features/events/closure/types/closure'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { Alert, Button } from '@/shared/components'

export interface EventClosureContentProps {
  /** `null` means "not found" — a malformed route id or an event the backend doesn't recognize, not a loading gap. Reuses `EventDetailUnavailableState`: same concern as Event Detail's own unavailable event. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  /** `null` means no closure diagnostic exists for this event — treated the same as unavailable. */
  readiness: EventClosureReadinessViewModel | null
  mermaReports: readonly MermaReportViewModel[]
  onSubmitWasteReport: (values: CreateWasteReportFormValues) => Promise<void>
  isSubmittingWasteReport?: boolean
  /** A safe, user-facing message for the most recent failed `POST /reportes-merma` attempt — never `technical_message`. Scoped to the form only, distinct from `errorMessage` (a whole-page read failure). */
  wasteReportErrorMessage?: string
  /** UX-only `capitan`/`admin` role gate for the "Finalizar evento" action — see `EventClosureFinalizeSection`'s own comment. */
  canFinalizeEvento: boolean
  onFinalizeEvento: () => void
  isFinalizingEvento?: boolean
  /** A safe, user-facing message for the most recent failed `PATCH /estado` attempt — never `technical_message`. */
  finalizeEventoErrorMessage?: string
}

/**
 * The reusable presentational composition — header + readiness diagnostic
 * + finalize action + cleanup/exit-checklist pointer + merma reports +
 * merma form, or exactly one of loading / error / unavailable, selected
 * purely from props. Still no payment calculation, no payment mutation, no W-08
 * anywhere in this composition — see this feature's README. Event
 * finalization (`en_curso → finalizado`) is the one state-machine mutation
 * this composition now owns, via `EventClosureFinalizeSection` — see that
 * component's own comment for the exact scope and backend contract.
 *
 * The one small addition for `feature/event-payments-ui-foundation`: a
 * restrained "Ir a pagos" link to `/eventos/{id}/pagos`, rendered ONLY
 * when `readiness.listo` is true. This is discoverability only — no
 * wizard/stepper, no forced navigation, no implication that Team
 * Selection → Attendance → Montage → Cierre → Pagos is a locked
 * sequence. The Event Detail roadmap remains the primary way to reach
 * Pagos; this is a contextual shortcut for the one moment ("this event
 * just became ready") where it's genuinely useful.
 */
export function EventClosureContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  readiness,
  mermaReports,
  onSubmitWasteReport,
  isSubmittingWasteReport = false,
  wasteReportErrorMessage,
  canFinalizeEvento,
  onFinalizeEvento,
  isFinalizingEvento = false,
  finalizeEventoErrorMessage,
}: EventClosureContentProps) {
  if (isLoading) {
    return <EventClosureLoadingState />
  }

  if (errorMessage) {
    return <EventClosureErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento || !readiness) {
    return <EventDetailUnavailableState />
  }

  return (
    <div className="flex flex-col gap-6">
      <EventClosureHeader idEvento={evento.idEvento} tituloEvento={evento.titulo} />

      <EventClosureReadinessSection readiness={readiness} />

      <EventClosureFinalizeSection
        estado={evento.estado}
        canFinalize={canFinalizeEvento}
        onFinalize={onFinalizeEvento}
        isFinalizing={isFinalizingEvento}
        {...(finalizeEventoErrorMessage
          ? { errorMessage: finalizeEventoErrorMessage }
          : {})}
      />

      {readiness.listo ? (
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to={`/eventos/${String(evento.idEvento)}/pagos`}>Ir a pagos</Link>
        </Button>
      ) : null}

      <EventClosureCleanupSection idEvento={evento.idEvento} />

      <EventClosureWasteReportsSection reports={mermaReports} />

      <EventDetailSection title="Registrar reporte de merma">
        <div className="flex flex-col gap-4">
          {wasteReportErrorMessage ? (
            <Alert tone="danger" title="No se pudo registrar el reporte">
              <p>{wasteReportErrorMessage}</p>
            </Alert>
          ) : null}
          <EventClosureWasteForm
            onSubmit={onSubmitWasteReport}
            isSubmitting={isSubmittingWasteReport}
          />
        </div>
      </EventDetailSection>
    </div>
  )
}
