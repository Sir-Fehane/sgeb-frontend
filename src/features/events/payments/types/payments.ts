/**
 * UI domain types for "Pagos" (Dispersión de pagos) — the captain's local
 * view of `docs/api/openapi-sgeb.yaml` v1.6.0's `Pago` schema and its
 * three current operations (`POST /pagos/calcular`,
 * `PATCH /pagos/{id}/pagado`, `PATCH /pagos/{id}/fallido`). This branch is
 * EVENT PAYMENTS only — no bank/gateway integration, no real transfer, no
 * W-08. See this feature's README section for the full boundary.
 *
 * **The retired bulk flow.** `POST /eventos/{id}/pagos/aprobar` was
 * removed in v1.5 ("cierre pago por pago") and replaced by the three
 * per-payment operations below, specifically because bulk approval had
 * nowhere to store each transfer's own banking reference. This feature
 * never calls, models, or labels anything as that retired endpoint.
 */

/** `Pago.estado`'s documented enum — exactly these four values. */
export type PaymentStatus = 'pendiente' | 'pagado' | 'fallido' | 'cancelado'

/**
 * `Pago` (`docs/api/openapi-sgeb.yaml` v1.6.0), field-for-field, plus one
 * presentation enrichment:
 *
 * - idPago ← `id_pago`
 * - idParticipacion ← `id_participacion`
 * - monto ← `monto` (MXN; a snapshot of `EVENTO.tarifa_por_mesero` taken
 *   at calculation time, never recomputed here from attendance × tariff)
 * - clabeDestinoEnmascarada ← `clabe_destino` — documented as **ALWAYS
 *   MASKED** in every API response ("El valor completo nunca sale del
 *   servidor, ni en respuestas ni en logs"). The full 18-digit CLABE is a
 *   database-only value this frontend never receives, never fixtures,
 *   never renders, and never accepts as input — the field is named
 *   `...Enmascarada` specifically so that safety property can't be missed
 *   at a call site. Fixtures use the documented example shape
 *   (`'0121…8909'`), never a raw 18-digit sequence.
 * - estado ← `estado`
 * - referencia ← `referencia` (nullable until `/pagado` is called)
 * - fechaPago ← `fecha_pago` (nullable until `/pagado` is called)
 * - **nombre is PRESENTATION ENRICHMENT, not a `Pago` API field.** `Pago`
 *   documents only `id_participacion` — no waiter name, email, UUID, or
 *   `id_usuario`. No participation fixture exists for event 3001 (the one
 *   event this feature's "ready" scenario uses — see
 *   `fixtures/paymentsFixtures.ts`), so `nombre` here is hand-authored
 *   fixture data, never joined from a documented response. A future live
 *   branch must resolve how the real payee name is sourced (a genuine
 *   open mapping question, not resolved here).
 *
 * Deliberately excluded: raw CLABE, `id_usuario`, any UUID, bank name,
 * account holder, a "transfer tracking id" beyond the documented
 * `referencia`, and any persisted `motivo`/`motivo_fallo` field — see the
 * module comment on `MarkFailedRequest` for why the last one matters.
 */
export interface EventPaymentViewModel {
  idPago: number
  idParticipacion: number
  nombre: string
  monto: number
  clabeDestinoEnmascarada: string
  estado: PaymentStatus
  referencia: string | null
  fechaPago: string | null
}

/**
 * `POST /eventos/{id_evento}/pagos/calcular`'s documented 201 response
 * shape, camelCase, with `pagos` upgraded from raw `Pago` to
 * `EventPaymentViewModel` (the same presentation-enrichment join applied
 * everywhere else in this feature — see the type above). `total` and
 * `yaPagados` are copied from the (fixture) result as-is, never
 * recomputed by summing `pagos` client-side beyond simple presentation
 * totals — the server owns the calculation.
 */
export interface PaymentCalculationResultViewModel {
  pagos: readonly EventPaymentViewModel[]
  total: number
  yaPagados: number
}

/** `PATCH /pagos/{id_pago}/pagado`'s exact documented request body, plus the local target id. */
export interface MarkPaidRequest {
  idPago: number
  referencia: string
}

/**
 * `PATCH /pagos/{id_pago}/fallido`'s exact documented request body, plus
 * the local target id.
 *
 * **`motivo` is submitted, never displayed as a persisted field.** The
 * `Pago` schema documents no `motivo`/`motivo_fallo`/`motivo_rechazo`
 * read-side field — only `estado`, `referencia`, and `fecha_pago` survive
 * on the record. This feature's local demo state must not invent one:
 * after a payment becomes `fallido`, its reason is not shown anywhere on
 * reload, exactly matching what the documented `Pago` schema would let a
 * real `GET /pagos` response show.
 */
export interface MarkFailedRequest {
  idPago: number
  motivo: string
}
