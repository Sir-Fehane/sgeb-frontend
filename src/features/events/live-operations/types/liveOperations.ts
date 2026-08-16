/**
 * UI domain types for "Operación en vivo" (event-scoped live participant
 * roster + captain/admin exit action), backed by the live `Participacion`
 * schema (`docs/api/openapi-sgeb.yaml`, confirmed against the pinned
 * backend's `ParticipacionEvento` model and `participacion_service.ts`).
 *
 * This screen has no roster-fetching service of its own — it reads the
 * exact same `GET /eventos/{id}/participaciones` resource through
 * `useTeamSelectionParticipantsQuery` (see `EventLiveOperationsPage`'s own
 * comment for why: the mutation this feature owns, `vinculo → salida`,
 * writes to that same server collection, so a second independent cache
 * over it would risk staleness rather than just redundancy). This type is
 * therefore, by design, structurally identical to
 * `TeamSelectionParticipantViewModel` — kept as its own declaration, not
 * imported, so this feature's presentation layer
 * (`utils/liveOperationsPresentation.ts`, `components/*`) depends on its
 * own contract rather than on Team Selection's, and can evolve
 * independently even though the data happens to flow through the same
 * query today.
 *
 * Field-by-field sourcing mirrors `features/events/team-selection/types/
 * teamSelection.ts`:
 * - idParticipacion: `Participacion.id_participacion`, a plain positive
 *   integer — the only identifier this screen ever sends back to the API.
 * - puesto: `Participacion.puesto` (`mesero | barra`).
 * - estado: the full documented 7-value lifecycle. Unlike Team Selection
 *   (which only acts on `aparto`), this screen must keep every state
 *   distinct — it is the one screen whose whole purpose is showing the
 *   real, unbucketed operational state and acting on exactly one of them
 *   (`vinculo`).
 * - nombre: `Participacion.usuario.nombre` + apellidos, composed in
 *   `team-selection/services/teamSelectionApi.ts`'s `nombreCompleto`.
 *
 * Deliberately excluded: phone, email, checklist_ok, lifecycle timestamps,
 * any internal `id_usuario` — none are part of this screen's scope (§20 of
 * the branch brief: a minimal roster + exit action, not a dashboard).
 */

/** `Participacion.estado` — the full documented lifecycle, in order. */
export type LiveOperationsParticipantEstado =
  | 'aparto'
  | 'seleccionado'
  | 'confirmo_asistencia'
  | 'confirmo_llegada'
  | 'asignado'
  | 'vinculo'
  | 'salida'

/** `Participacion.puesto` enum. */
export type LiveOperationsParticipantPuesto = 'mesero' | 'barra'

export interface LiveOperationsParticipantViewModel {
  idParticipacion: number
  nombre: string
  puesto: LiveOperationsParticipantPuesto
  estado: LiveOperationsParticipantEstado
}

/**
 * The only transition this screen performs
 * (`PATCH /participaciones/{id_participacion}/estado` restricted to
 * `estado: 'salida'`), and only ever for a participant currently at
 * `vinculo` — the pinned backend's `TRANSICIONES` map has exactly one
 * legal next state per state, and `vinculo → salida` is it. No rollback:
 * `salida` is terminal (`TRANSICIONES.salida = []`).
 */
export interface MarkParticipantSalidaRequest {
  idParticipacion: number
}

/**
 * Per-row UI state for the in-flight exit action — independent of
 * `LiveOperationsParticipantViewModel.estado`, which reflects only the
 * last-fetched server snapshot. Mirrors
 * `TeamSelectionRowStatus`/`TeamSelectionPage`'s `rowStatuses` pattern,
 * minus a transient "success" value: once a `salida` mutation succeeds,
 * the roster invalidation/refetch is what actually moves the row to its
 * terminal, read-only presentation — there is no local guess to hold in
 * the meantime.
 */
export type LiveOperationsRowStatus = 'idle' | 'marking' | 'error'
