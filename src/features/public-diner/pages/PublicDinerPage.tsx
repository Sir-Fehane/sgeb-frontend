import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { PublicDinerContent } from '@/features/public-diner/components/PublicDinerContent'
import { PublicDinerLayout } from '@/features/public-diner/components/PublicDinerLayout'
import { PUBLIC_DINER_TABLE_FIXTURE } from '@/features/public-diner/fixtures/publicDinerFixtures'
import type {
  PublicDinerAttentionRequest,
  PublicDinerRatingValues,
  RatingStatus,
  ServiceRequestStatus,
} from '@/features/public-diner/types/publicDiner'
import { Alert, Text } from '@/shared/components'

const DEMO_REQUEST_SUCCESS_MESSAGE =
  'Demostración: la solicitud se validó localmente; aún no se envió al personal.'
const DEMO_RATING_SUCCESS_MESSAGE =
  'Demostración: tu calificación se validó localmente; aún no se envió al personal. No se guarda al recargar la página.'

/**
 * Routed at /publico/mesas/:codigoQr. Entirely presentation-only:
 * `PUBLIC_DINER_TABLE_FIXTURE` is development/demo data, never a real
 * `GET /publico/mesas/{codigo_qr}` response (see
 * features/public-diner/fixtures). No API request, no MSW, no fake
 * network delay, no localStorage/sessionStorage, no development-state
 * selector.
 *
 * `codigoQr` is read from the route only to confirm the route matched —
 * it is never rendered, converted, validated as identity, or used to
 * pick a fixture variant. Local React state demonstrates the attention
 * request and rating interaction states honestly: both success paths
 * use an explicit "esto es una demostración, nada se envió" message
 * (`requestSuccessMessage`/`ratingSuccessMessage` overrides — see
 * `PublicDinerContent`) instead of the components' real default success
 * copy, so nothing here ever claims a real request reached a person.
 * Refreshing the page resets all demo state — nothing persists.
 */
export function PublicDinerPage() {
  useParams<{ codigoQr: string }>()

  const [requestStatus, setRequestStatus] = useState<ServiceRequestStatus>('idle')
  const [ratingStatus, setRatingStatus] = useState<RatingStatus>('idle')

  function handleRequestAttention(_request: PublicDinerAttentionRequest) {
    setRequestStatus('success')
  }

  function handleSubmitRating(_values: PublicDinerRatingValues) {
    setRatingStatus('success')
  }

  return (
    <PublicDinerLayout>
      <Alert tone="info" title="Datos de desarrollo">
        <Text size="sm">
          Esta vista usa datos de desarrollo (<code>features/public-diner/fixtures</code>
          ), no información real. Ninguna acción de esta página contacta al personal.
        </Text>
      </Alert>

      <PublicDinerContent
        table={PUBLIC_DINER_TABLE_FIXTURE}
        isLoading={false}
        requestStatus={requestStatus}
        requestSuccessMessage={DEMO_REQUEST_SUCCESS_MESSAGE}
        onRequestAttention={handleRequestAttention}
        ratingStatus={ratingStatus}
        ratingSuccessMessage={DEMO_RATING_SUCCESS_MESSAGE}
        onSubmitRating={handleSubmitRating}
      />
    </PublicDinerLayout>
  )
}
