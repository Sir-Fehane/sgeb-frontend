import type { PagoViewModel } from '@/features/events/payments/types/payments'
import { isSgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of `Pago` (`docs/api/openapi-sgeb.yaml`, confirmed against
 * the pinned backend's `app/modules/cierre/models/pago.ts` serializer).
 * `clabe_destino` is always masked server-side (`XXXX…XXXX`) — the
 * backend never serializes the raw 18-digit CLABE on this or any other
 * endpoint.
 */
export interface PagoApiRecord {
  id_pago: number
  id_participacion: number
  monto: number
  clabe_destino: string
  estado: PagoViewModel['estado']
  referencia: string | null
  fecha_pago: string | null
}

/**
 * Wire shape of `POST /eventos/{id_evento}/pagos/calcular`'s 201
 * response, confirmed against `CierreService.calcularPagos`. `pagos` is
 * intentionally not mapped/exposed by `calculateEventPayments` below —
 * nothing on this screen renders the calculation call's own echoed rows,
 * the invalidated list refetch is what brings the authoritative,
 * name-joined data back.
 */
export interface CalcularPagosApiRecord {
  pagos: PagoApiRecord[]
  total: number
  ya_pagados: number
}

function mapPago(record: PagoApiRecord): PagoViewModel {
  return {
    idPago: record.id_pago,
    idParticipacion: record.id_participacion,
    monto: record.monto,
    clabeDestinoEnmascarada: record.clabe_destino,
    estado: record.estado,
    referencia: record.referencia,
    fechaPago: record.fecha_pago,
  }
}

/**
 * Fetches every payment recorded for the event through the shared
 * authenticated SGEB transport. Lets `SgebApplicationError`/
 * `SgebNetworkError` propagate unchanged — the caller decides how to
 * present each outcome, same as `fetchClosureReadiness`.
 */
export async function fetchEventPayments(
  idEvento: number,
  signal?: AbortSignal,
): Promise<PagoViewModel[]> {
  const envelope = await requestSgeb<PagoApiRecord[]>({
    url: `/eventos/${String(idEvento)}/pagos`,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapPago)
}

/**
 * `POST /eventos/{id_evento}/pagos/calcular` — no request body (the
 * amount is 100% server-derived from `EVENTO.tarifa_por_mesero`, never
 * client-provided). Idempotent: a `pagado` `Pago` is never recalculated,
 * `pendiente`/`fallido` ones are refreshed. Only `total`/`yaPagados` are
 * surfaced — see `CalcularPagosApiRecord`'s comment for why `pagos` is
 * dropped here.
 */
export async function calculateEventPayments(
  idEvento: number,
): Promise<{ total: number; yaPagados: number }> {
  const envelope = await requestSgeb<CalcularPagosApiRecord>({
    url: `/eventos/${String(idEvento)}/pagos/calcular`,
    method: 'POST',
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful
    // calculation always returns the result object — guarded
    // defensively rather than assumed, same as `fetchClosureReadiness`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return { total: envelope.data.total, yaPagados: envelope.data.ya_pagados }
}

/**
 * `PATCH /pagos/{id_pago}/pagado` — registers that the (manual, outside
 * SGEB) transfer was completed. `referencia` is normalized
 * (trim + uppercase) server-side; the returned record reflects that
 * normalized value, never the raw form input.
 */
export async function markPaymentPaid(
  idPago: number,
  referencia: string,
): Promise<PagoViewModel> {
  const envelope = await requestSgeb<PagoApiRecord>({
    url: `/pagos/${String(idPago)}/pagado`,
    method: 'PATCH',
    data: { referencia },
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — guarded defensively
    // rather than assumed, same as `markPaymentPaid`'s sibling calls.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapPago(envelope.data)
}

/**
 * `PATCH /pagos/{id_pago}/fallido` — registers that the (manual)
 * transfer was rejected. Confirmed against the pinned backend
 * (`CierreService.marcarFallido`) and `docs/decisions.md`: this endpoint
 * **always** responds as an HTTP/business error (`SGEB-5004`), yet the
 * `estado = 'fallido'` write is committed before that error is thrown.
 * This function does not special-case that — it lets the
 * `SgebApplicationError` propagate unchanged, same as every other
 * service function in this codebase. Callers (the mutation hook's
 * `onError`, and the page's submit handler) are responsible for treating
 * `isPaymentFallidoRecorded(error) === true` as an expected, successful
 * outcome rather than a real failure.
 */
export async function markPaymentFailed(idPago: number, motivo: string): Promise<void> {
  await requestSgeb<PagoApiRecord>({
    url: `/pagos/${String(idPago)}/fallido`,
    method: 'PATCH',
    data: { motivo },
  })
}

/**
 * True only for the one documented "error response, real mutation"
 * case this feature has to account for: `PATCH /pagos/{id}/fallido`
 * responding `SGEB-5004` after having already persisted
 * `estado = 'fallido'`. Any other error (network failure, a different
 * business code, an already-`pagado` `SGEB-4011` conflict) is a real
 * failure and must not be swallowed.
 */
export function isPaymentFallidoRecorded(error: unknown): boolean {
  return isSgebApplicationError(error) && error.code === 'SGEB-5004'
}
