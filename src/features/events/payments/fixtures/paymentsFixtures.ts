import type {
  EventPaymentViewModel,
  PaymentCalculationResultViewModel,
} from '@/features/events/payments/types/payments'

/**
 * Development/demo fixtures only — NOT live backend data. Event 3001 is
 * the primary "payments available" scenario: its Closure readiness
 * fixture (`features/events/closure/fixtures/closureFixtures.ts`) is the
 * only one with `listo: true`, matching its shared
 * `EventDetailViewModel.estado === 'finalizado'` — see that file's own
 * cross-fixture coherence note. Events 1001/2001 stay `listo: false`
 * there, so payment calculation is unavailable for them here too; neither
 * gets a payments fixture, and neither Closure fixture is touched.
 *
 * No participation fixture exists for event 3001 in Team Selection/
 * Attendance/Montage, so `nombre` below is hand-authored, presentation-
 * only fixture data (idParticipacion `9001`–`9004`, a clearly new range,
 * continuing the "Mesero de demostración <ordinal>" naming already used
 * across those features) — not joined from any other feature's fixture,
 * and not invented Attendance/Montage history just to back a name (see
 * `types/payments.ts`'s note on the participant-identity gap). Masked
 * CLABE values use the documented example shape (`'0121…8909'`) — never a
 * raw 18-digit sequence.
 *
 * One row of each documented `estado` is pre-seeded so the mixed-state UI
 * is visible on first load without requiring any interaction:
 * `pendiente` (no reference/date yet), `pagado` (terminal, with a
 * reference and date), `fallido` (no reference/date — the endpoint that
 * produces this state accepts a `motivo`, never a `referencia`),
 * `cancelado` (display-only; no endpoint documents how a payment reaches
 * this state — see the README's contract-gap note).
 */
const EVENT_PAYMENTS: Readonly<Record<number, readonly EventPaymentViewModel[]>> = {
  3001: [
    {
      idPago: 1,
      idParticipacion: 9001,
      nombre: 'Mesero de demostración catorce',
      monto: 440,
      clabeDestinoEnmascarada: '0121…8909',
      estado: 'pendiente',
      referencia: null,
      fechaPago: null,
    },
    {
      idPago: 2,
      idParticipacion: 9002,
      nombre: 'Mesero de demostración quince',
      monto: 440,
      clabeDestinoEnmascarada: '0233…4471',
      estado: 'pagado',
      referencia: 'REF-000456',
      fechaPago: '2026-05-03T15:30:00Z',
    },
    {
      idPago: 3,
      idParticipacion: 9003,
      nombre: 'Mesero de demostración dieciséis',
      monto: 440,
      clabeDestinoEnmascarada: '0198…2210',
      estado: 'fallido',
      referencia: null,
      fechaPago: null,
    },
    {
      idPago: 4,
      idParticipacion: 9004,
      nombre: 'Mesero de demostración diecisiete',
      monto: 440,
      clabeDestinoEnmascarada: '0344…7765',
      estado: 'cancelado',
      referencia: null,
      fechaPago: null,
    },
  ],
}

/** Returns the event's current payment rows — `[]` when calculation has never run (or is unavailable) for this event. */
export function findEventPayments(idEvento: number): readonly EventPaymentViewModel[] {
  return EVENT_PAYMENTS[idEvento] ?? []
}

/**
 * Per-event PREBUILT fixture result for "Calcular pagos"/"Recalcular
 * pagos" — authored data representing what `POST /pagos/calcular` would
 * return, not a function of whatever the frontend currently holds in
 * memory. The frontend does not implement the server's transition
 * algorithm (it has no state machine deciding "pendiente/fallido ->
 * pendiente" from current rows); this fixture is simply pre-written to
 * already show that shape:
 *
 * - the pagado row (idPago 2) is authored identically to its
 *   pre-calculation counterpart in `EVENT_PAYMENTS` — "pagado es
 *   historia y NO se recalcula" is demonstrated by writing the same
 *   values twice, not by a rule that copies them forward.
 * - the cancelado row (idPago 4) is likewise authored unchanged.
 * - the fallido row (idPago 3) is authored here already in its
 *   post-recalculation `pendiente` shape (reference/date cleared) — a
 *   worked example of "uno en pendiente o fallido sí se actualiza," not
 *   a computed transformation of the input.
 * - `total`/`yaPagados` are values recorded alongside this authored
 *   list, mirroring the documented response shape.
 */
const EVENT_PAYMENTS_CALCULATION_RESULT: Readonly<
  Record<number, PaymentCalculationResultViewModel>
> = {
  3001: {
    pagos: [
      {
        idPago: 1,
        idParticipacion: 9001,
        nombre: 'Mesero de demostración catorce',
        monto: 440,
        clabeDestinoEnmascarada: '0121…8909',
        estado: 'pendiente',
        referencia: null,
        fechaPago: null,
      },
      {
        idPago: 2,
        idParticipacion: 9002,
        nombre: 'Mesero de demostración quince',
        monto: 440,
        clabeDestinoEnmascarada: '0233…4471',
        estado: 'pagado',
        referencia: 'REF-000456',
        fechaPago: '2026-05-03T15:30:00Z',
      },
      {
        idPago: 3,
        idParticipacion: 9003,
        nombre: 'Mesero de demostración dieciséis',
        monto: 440,
        clabeDestinoEnmascarada: '0198…2210',
        estado: 'pendiente',
        referencia: null,
        fechaPago: null,
      },
      {
        idPago: 4,
        idParticipacion: 9004,
        nombre: 'Mesero de demostración diecisiete',
        monto: 440,
        clabeDestinoEnmascarada: '0344…7765',
        estado: 'cancelado',
        referencia: null,
        fechaPago: null,
      },
    ],
    total: 1320,
    yaPagados: 1,
  },
}

/**
 * The local "Calcular pagos"/"Recalcular pagos" callback's fixture
 * lookup. Deliberately takes ONLY `idEvento` — never the current local
 * payments list — so it cannot, by construction, decide from existing
 * frontend state how the backend would recalculate a payment. An event
 * with no entry in `EVENT_PAYMENTS_CALCULATION_RESULT` simply has no
 * calculation fixture yet, which produces an empty result.
 */
export function calculatePaymentsResult(
  idEvento: number,
): PaymentCalculationResultViewModel {
  return (
    EVENT_PAYMENTS_CALCULATION_RESULT[idEvento] ?? { pagos: [], total: 0, yaPagados: 0 }
  )
}
