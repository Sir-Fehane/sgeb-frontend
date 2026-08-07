import type { TeamSelectionParticipantViewModel } from '@/features/events/team-selection/types/teamSelection'

/**
 * Development/demo fixtures only — NOT live backend data. All names are
 * neutral and fictional, matching `features/waiters/fixtures`' naming
 * convention. Deliberately small.
 *
 * Keyed by `idEvento`, aligned with `EVENT_DETAIL_FIXTURES`
 * (`features/events/fixtures/eventDetailFixtures.ts`):
 * - 1001: a mix of applicants (`aparto`) and an already-selected
 *   participant, demonstrating both list states populated at once.
 * - 2001: only applicants — demonstrates "selected list empty".
 * - Any other event id (including the events-list-only fixtures
 *   1002–1005, which have no matching `EventDetailViewModel` either)
 *   naturally returns an empty list — "no applicants" and "selected list
 *   empty" simultaneously, a valid outcome, not a bug.
 */
const TEAM_SELECTION_FIXTURES: Readonly<
  Record<number, readonly TeamSelectionParticipantViewModel[]>
> = {
  1001: [
    {
      idParticipacion: 5001,
      nombre: 'Mesero de demostración uno',
      puesto: 'mesero',
      estado: 'aparto',
    },
    {
      idParticipacion: 5002,
      nombre: 'Mesero de demostración dos',
      puesto: 'barra',
      estado: 'aparto',
    },
    {
      idParticipacion: 5003,
      nombre: 'Mesero de demostración tres',
      puesto: 'mesero',
      estado: 'seleccionado',
    },
  ],
  2001: [
    {
      idParticipacion: 5004,
      nombre: 'Mesero de demostración cuatro',
      puesto: 'mesero',
      estado: 'aparto',
    },
  ],
}

export function findTeamSelectionParticipants(
  idEvento: number,
): readonly TeamSelectionParticipantViewModel[] {
  return TEAM_SELECTION_FIXTURES[idEvento] ?? []
}
