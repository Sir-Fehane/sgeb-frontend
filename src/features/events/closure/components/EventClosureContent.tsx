import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import { EventClosureCleanupSection } from '@/features/events/closure/components/EventClosureCleanupSection'
import { EventClosureErrorState } from '@/features/events/closure/components/EventClosureErrorState'
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

export interface EventClosureContentProps {
  /** `null` means "not found" — a fixture-lookup miss or a malformed route id, not a loading gap. Reuses `EventDetailUnavailableState`: same concern as Event Detail's own unavailable event. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  /** `null` means no closure diagnostic exists for this event — treated the same as unavailable. */
  readiness: EventClosureReadinessViewModel | null
  mermaReports: readonly MermaReportViewModel[]
  onSubmitWasteReport: (values: CreateWasteReportFormValues) => Promise<void>
  isSubmittingWasteReport?: boolean
}

/**
 * The reusable presentational composition — header + readiness diagnostic
 * + cleanup contract-gap notice + merma reports + merma form, or exactly
 * one of loading / error / unavailable, selected purely from props. No
 * payment calculation, no payment mutation, no W-08, no event-finalization
 * mutation anywhere in this composition — see this feature's README.
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

      <EventClosureCleanupSection />

      <EventClosureWasteReportsSection reports={mermaReports} />

      <EventDetailSection title="Registrar reporte de merma">
        <EventClosureWasteForm
          onSubmit={onSubmitWasteReport}
          isSubmitting={isSubmittingWasteReport}
        />
      </EventDetailSection>
    </div>
  )
}
