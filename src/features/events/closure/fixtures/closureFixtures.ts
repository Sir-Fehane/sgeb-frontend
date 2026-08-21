import type {
  EventClosureReadinessViewModel,
  MermaReportViewModel,
} from '@/features/events/closure/types/closure'

/**
 * Development/demo fixtures — NOT live backend data. Neither
 * `EventClosurePage` nor `EventPaymentsPage` reads these anymore: both use
 * their own real live queries (`useEventClosureReadinessQuery`/
 * `useMermaReportsQuery`, `useEventPaymentsQuery` and friends) against the
 * real backend. This file stays only for this feature's own tests
 * (`closureFixtures.test.ts`) — confirmed no production consumer remains
 * as of feature/operations-and-reports-live's audit. Reuses
 * existing Event Detail identity (events 1001/2001/3001) rather than
 * duplicating event title/type/status inside this feature. `listo` is
 * hand-authored per fixture as the SERVER-DERIVED value it is in the live
 * response — `assertReadinessConsistency` below is a small,
 * presentation-only dev check that fixture authors kept it logically
 * coherent with the other four fields; it is never used to recompute
 * `listo` for real presentation logic (see `types/closure.ts`).
 *
 * Each fixture's `eventoFinalizado` is kept coherent with that SAME
 * event id's `EventDetailViewModel.estado` in
 * `fixtures/eventDetailFixtures.ts` — `eventoFinalizado: true` means "this
 * event satisfies the documented `finalizado` prerequisite," so it must
 * never be paired with a shared event record whose own `estado` isn't
 * `'finalizado'`. This is enforced by a dedicated cross-fixture test
 * (`closureFixtures.test.ts`), not just by convention.
 *
 * - 1001 ("blocked", `estado: 'publicado'`): not finalized, some
 *   participations without a verified exit, some meseros without active
 *   banking details — `listo: false`. Also has one existing merma report,
 *   covering the "populated reports" list state.
 * - 2001 ("in progress", `estado: 'en_curso'`): not finalized yet, but no
 *   other blockers — `listo: false` (finalization alone still blocks it).
 *   Has zero merma reports, covering the "no reports" empty state.
 * - 3001 ("ready", `estado: 'finalizado'`): finalized, zero pending
 *   exits, zero banking blockers — `listo: true`. `idEvento: 3001` was
 *   added to `eventDetailFixtures.ts` specifically for this scenario:
 *   `eventoFinalizado: true` cannot be coherently attached to 1001
 *   (`publicado`) or 2001 (`en_curso`) without contradicting that same
 *   event's own displayed status elsewhere in the app (e.g. on
 *   `/eventos/:id` itself, reachable from this same event's roadmap
 *   link). Has zero merma reports.
 */
export function assertReadinessConsistency(
  readiness: EventClosureReadinessViewModel,
): EventClosureReadinessViewModel {
  const expectedListo =
    readiness.eventoFinalizado &&
    readiness.participacionesSinSalida === 0 &&
    readiness.meserosSinClabeVigente === 0

  if (readiness.listo !== expectedListo) {
    throw new Error(
      'closureFixtures: inconsistent fixture — `listo` does not match the ' +
        'other three documented blockers. This check exists only to keep ' +
        'demo fixtures coherent; it is never used to recompute `listo` at ' +
        'runtime, which stays server-derived.',
    )
  }

  return readiness
}

const CLOSURE_READINESS: Readonly<Record<number, EventClosureReadinessViewModel>> = {
  1001: assertReadinessConsistency({
    eventoFinalizado: false,
    participacionesTotal: 8,
    participacionesSinSalida: 3,
    meserosSinClabeVigente: 2,
    listo: false,
  }),
  2001: assertReadinessConsistency({
    eventoFinalizado: false,
    participacionesTotal: 5,
    participacionesSinSalida: 0,
    meserosSinClabeVigente: 0,
    listo: false,
  }),
  3001: assertReadinessConsistency({
    eventoFinalizado: true,
    participacionesTotal: 5,
    participacionesSinSalida: 0,
    meserosSinClabeVigente: 0,
    listo: true,
  }),
}

const MERMA_REPORTS: Readonly<Record<number, readonly MermaReportViewModel[]>> = {
  1001: [
    {
      idReporte: 1,
      fecha: '2026-09-12T23:10:00Z',
      observaciones: 'Se rompieron al recoger el salón.',
      detalles: [
        {
          tipo: 'copa_rota',
          descripcion: 'Copas de la barra',
          cantidad: 4,
          costoEstimado: 320,
        },
        { tipo: 'plato_roto', descripcion: null, cantidad: 2, costoEstimado: 150 },
      ],
    },
  ],
  2001: [],
  3001: [],
}

/** Returns `null` when no closure diagnostic exists for the event — treated as unavailable, same as an unknown event. */
export function findEventClosureReadiness(
  idEvento: number,
): EventClosureReadinessViewModel | null {
  return CLOSURE_READINESS[idEvento] ?? null
}

export function findMermaReports(idEvento: number): readonly MermaReportViewModel[] {
  return MERMA_REPORTS[idEvento] ?? []
}
