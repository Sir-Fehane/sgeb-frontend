import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { PublicDinerContent } from '@/features/public-diner/components/PublicDinerContent'
import { PublicDinerLayout } from '@/features/public-diner/components/PublicDinerLayout'
import { useCalificarMutation } from '@/features/public-diner/queries/useCalificarMutation'
import { useCrearSolicitudMutation } from '@/features/public-diner/queries/useCrearSolicitudMutation'
import { useMesaPublicaQuery } from '@/features/public-diner/queries/useMesaPublicaQuery'
import { PUBLIC_DINER_CODE } from '@/features/public-diner/services/publicDinerApi'
import {
  hasSubmittedRating,
  markRatingSubmitted,
} from '@/features/public-diner/services/tokenComensalStorage'
import type {
  PublicDinerRatingValues,
  RatingStatus,
  ServiceRequestStatus,
} from '@/features/public-diner/types/publicDiner'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — mirrors every other page's own
 * `toSafeErrorMessage` (e.g. `EventDetailPage`). Duplicated locally rather
 * than shared: CLAUDE.md prefers this over a premature cross-page
 * abstraction, same reasoning already established at every other call
 * site.
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

/**
 * `SGEB-3002` on `POST /calificaciones` has exactly one cause in the
 * pinned backend (`ComensalService.calificar`, confirmed by reading the
 * service, not guessed from the code alone): no `AsignacionMesa` with
 * `vinculada=true` exists for this mesa yet — nobody to rate. The
 * server's own generic catalogue copy for `SGEB-3002` ("Uno de los datos
 * relacionados ya no existe...") is accurate but was observed during
 * manual smoke to read as a confusing, unexplained failure. Since this
 * specific endpoint's `SGEB-3002` genuinely only ever means "no mesero
 * linked yet," this narrower, still-truthful copy replaces it here —
 * every other error on this mutation still falls through to the
 * server's own message unchanged.
 */
function toRatingErrorMessage(error: unknown): string {
  if (
    isSgebApplicationError(error) &&
    error.code === PUBLIC_DINER_CODE.SIN_MESERO_VINCULADO
  ) {
    return 'No pudimos registrar tu calificación porque esta mesa todavía no tiene un mesero vinculado.'
  }
  return toSafeErrorMessage(error)
}

/**
 * Routed at /publico/mesas/:codigoQr. Live integration against the pinned
 * backend's actual anonymous `/publico/mesas/{codigo_qr}*` endpoints
 * (`services/publicDinerApi.ts`) — no fixture, no demo disclosure, no
 * local-only fake success. `AttentionRequestAction`/`RatingForm` render
 * exactly the real server outcome: `submitting` while the mutation is in
 * flight, `success`/`error` from its settled state, and the two
 * documented business outcomes (`SGEB-4014` "a request is already
 * pending," `SGEB-4010` "already rated") mapped to their own dedicated UI
 * states rather than a generic error.
 *
 * There is no readback endpoint for a diner's own solicitud (confirmed
 * absent from the pinned backend), so attention-request `success` here is
 * an honest, session-only UI state — not a persisted status timeline.
 * Reloading the page re-fetches the mesa context fresh but cannot recover
 * "did my request already go through"; that limitation is real, not a gap
 * in this page.
 *
 * The rating has a narrower version of the same gap, closed as a local UX
 * shortcut rather than invented server state: after a CONFIRMED backend
 * outcome (a successful `POST /calificaciones`, or its `SGEB-4010`
 * "already rated" response), `markRatingSubmitted` persists a per-QR
 * marker (`services/tokenComensalStorage.ts`) so a reload doesn't show
 * the form again. This is purely cosmetic — the backend's own `UNIQUE`
 * constraint remains the actual duplicate-rating guard, so clearing this
 * browser's storage (or rating from a different browser) can surface the
 * form again, and the server still rejects the second submission.
 */
export function PublicDinerPage() {
  const { codigoQr } = useParams<{ codigoQr: string }>()

  const mesaQuery = useMesaPublicaQuery(codigoQr ?? null)
  const solicitudMutation = useCrearSolicitudMutation(codigoQr ?? '')
  const calificarMutation = useCalificarMutation(codigoQr ?? '')

  /**
   * Read once per `codigoQr` (a `useMemo`, not a `useState`+effect pair):
   * this is a pure derivation from render-time state (the stored marker),
   * not a subscription to an external system, so syncing it via an effect
   * would just cause an avoidable extra render on mount. Deliberately NOT
   * re-derived after a same-session submission below — that keeps this
   * session's own `success`/`already-submitted` view driven by the
   * mutation's real state, and only affects the *next* mount/reload.
   */
  const ratingAlreadySubmitted = useMemo(
    () => codigoQr !== undefined && hasSubmittedRating(codigoQr),
    [codigoQr],
  )

  const calificarError = calificarMutation.error
  useEffect(() => {
    if (codigoQr === undefined) return
    const isDuplicate =
      isSgebApplicationError(calificarError) &&
      calificarError.code === PUBLIC_DINER_CODE.CALIFICACION_DUPLICADA
    if (calificarMutation.isSuccess || isDuplicate) {
      markRatingSubmitted(codigoQr)
    }
  }, [codigoQr, calificarMutation.isSuccess, calificarError])

  const requestStatus: ServiceRequestStatus = solicitudMutation.isPending
    ? 'submitting'
    : solicitudMutation.isSuccess
      ? 'success'
      : solicitudMutation.isError
        ? isSgebApplicationError(solicitudMutation.error) &&
          solicitudMutation.error.code === PUBLIC_DINER_CODE.SOLICITUD_EN_CURSO
          ? 'throttled'
          : 'error'
        : 'idle'

  const ratingStatus: RatingStatus = ratingAlreadySubmitted
    ? 'already-submitted'
    : calificarMutation.isPending
      ? 'submitting'
      : calificarMutation.isSuccess
        ? 'success'
        : calificarMutation.isError
          ? isSgebApplicationError(calificarMutation.error) &&
            calificarMutation.error.code === PUBLIC_DINER_CODE.CALIFICACION_DUPLICADA
            ? 'already-submitted'
            : 'error'
          : 'idle'

  const notFound =
    codigoQr === undefined ||
    (mesaQuery.isError &&
      isSgebApplicationError(mesaQuery.error) &&
      mesaQuery.error.code === PUBLIC_DINER_CODE.MESA_NO_ENCONTRADA)

  const errorMessage =
    mesaQuery.isError && !notFound ? toSafeErrorMessage(mesaQuery.error) : undefined

  function handleRequestAttention() {
    solicitudMutation.mutate()
  }

  function handleSubmitRating(values: PublicDinerRatingValues) {
    calificarMutation.mutate(values)
  }

  return (
    <PublicDinerLayout>
      <PublicDinerContent
        table={mesaQuery.data}
        isLoading={codigoQr !== undefined && mesaQuery.isPending}
        notFound={notFound}
        errorMessage={errorMessage}
        onRetry={() => void mesaQuery.refetch()}
        requestStatus={requestStatus}
        requestMessage={
          requestStatus === 'error'
            ? toSafeErrorMessage(solicitudMutation.error)
            : undefined
        }
        onRequestAttention={codigoQr ? handleRequestAttention : undefined}
        ratingStatus={ratingStatus}
        ratingMessage={
          ratingStatus === 'error'
            ? toRatingErrorMessage(calificarMutation.error)
            : undefined
        }
        onSubmitRating={codigoQr ? handleSubmitRating : undefined}
      />
    </PublicDinerLayout>
  )
}
