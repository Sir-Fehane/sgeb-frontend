import { useId } from 'react'

import { AttentionRequestAction } from '@/features/public-diner/components/AttentionRequestAction'
import { PublicDinerErrorState } from '@/features/public-diner/components/PublicDinerErrorState'
import { PublicDinerHeader } from '@/features/public-diner/components/PublicDinerHeader'
import { PublicDinerLoadingState } from '@/features/public-diner/components/PublicDinerLoadingState'
import { PublicDinerUnavailableState } from '@/features/public-diner/components/PublicDinerUnavailableState'
import { RatingForm } from '@/features/public-diner/components/RatingForm'
import type {
  PublicDinerAttentionRequest,
  PublicDinerRatingValues,
  PublicDinerTableViewModel,
  RatingStatus,
  ServiceRequestStatus,
} from '@/features/public-diner/types/publicDiner'
import { SectionHeading } from '@/shared/components'

export interface PublicDinerContentProps {
  table?: PublicDinerTableViewModel | undefined
  isLoading?: boolean | undefined
  /** The mesa resource itself is unavailable (invalid/expired QR, documented 404) — distinct from a crash. */
  notFound?: boolean | undefined
  /** A genuine unexpected failure — never raw `Error.message`/`technical_message`. */
  errorMessage?: string | undefined
  onRetry?: (() => void) | undefined
  requestStatus: ServiceRequestStatus
  requestMessage?: string | undefined
  /** Overrides the default "Hemos avisado a tu mesero. En un momento te atenderá." success copy — see `AttentionRequestAction`. */
  requestSuccessMessage?: string | undefined
  onRequestAttention?: ((request: PublicDinerAttentionRequest) => void) | undefined
  ratingStatus: RatingStatus
  ratingMessage?: string | undefined
  /** Overrides the default thank-you copy — see `RatingForm`. */
  ratingSuccessMessage?: string | undefined
  onSubmitRating?: ((values: PublicDinerRatingValues) => void) | undefined
}

/**
 * The presentational public-diner composition — not coupled to the
 * router or any fixture, purely props-driven, mirroring the
 * `*Content` architecture used throughout this app
 * (`EventsContent`/`WaitersContent`/`CaptainDashboardContent`/
 * `ReportsContent`). `PublicDinerPage` is the thin, fixture-backed
 * wiring layer; real API integration wires state into these same props
 * without touching this component.
 *
 * Exactly one of loading / not-found / global-error / populated renders
 * at a time — no fixture data or actions ever render underneath a
 * loading or error state.
 */
export function PublicDinerContent({
  table,
  isLoading = false,
  notFound = false,
  errorMessage,
  onRetry,
  requestStatus,
  requestMessage,
  requestSuccessMessage,
  onRequestAttention,
  ratingStatus,
  ratingMessage,
  ratingSuccessMessage,
  onSubmitRating,
}: PublicDinerContentProps) {
  const ratingHeadingId = useId()

  if (isLoading) {
    return <PublicDinerLoadingState />
  }

  if (notFound) {
    return <PublicDinerUnavailableState onRetry={onRetry} />
  }

  if (errorMessage) {
    return <PublicDinerErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!table) {
    return null
  }

  return (
    <div className="flex flex-col gap-8">
      <PublicDinerHeader etiqueta={table.etiqueta} eventoTitulo={table.evento.titulo} />

      <section className="flex flex-col gap-3">
        <AttentionRequestAction
          status={requestStatus}
          message={requestMessage}
          successMessage={requestSuccessMessage}
          onRequestAttention={onRequestAttention}
        />
      </section>

      <section aria-labelledby={ratingHeadingId} className="flex flex-col gap-3">
        <SectionHeading id={ratingHeadingId} className="text-subheading">
          Califica a tu mesero
        </SectionHeading>
        <RatingForm
          status={ratingStatus}
          message={ratingMessage}
          successMessage={ratingSuccessMessage}
          onSubmitRating={onSubmitRating}
        />
      </section>
    </div>
  )
}
