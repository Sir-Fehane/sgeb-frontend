/**
 * UI domain types for W-05 "Seleccionar equipo", now backed by the live
 * `Participacion` schema (`docs/api/openapi-sgeb.yaml`, confirmed against
 * the pinned backend's `ParticipacionEvento` model and
 * `participacion_service.ts`).
 *
 * Field-by-field sourcing:
 * - idParticipacion: `Participacion.id_participacion` — a plain positive
 *   integer, never a UUID. `USUARIO` is the only domain entity with a
 *   public UUID identifier; participations are not `USUARIO` rows.
 * - puesto: `Participacion.puesto` (`mesero | barra`).
 * - estado: the full documented 7-value lifecycle. This screen only acts
 *   on `aparto` (shows a "Seleccionar" action); every later state
 *   (`seleccionado` through `salida`) renders identically in the selected
 *   list — those later states belong to Attendance/Montage screens,
 *   explicitly out of scope here, but a participant who has progressed
 *   past `aparto` must still appear somewhere in this roster rather than
 *   silently vanish.
 * - nombre: `Participacion.usuario.nombre` +
 *   `apellido_paterno`/`apellido_materno`, composed in
 *   `services/teamSelectionApi.ts` — the same join
 *   `features/waiters/types/waiter.ts` documents for `nombreCompleto`.
 *
 * Deliberately excluded: phone, email, checklist_ok, the lifecycle
 * timestamps, any captain/UUID identifier, or an internal numeric
 * `id_usuario` — `Participacion.usuario` never serializes it, and none of
 * these fields have a documented use on this screen.
 */

/** `Participacion.estado` — the full documented lifecycle, in order. */
export type TeamSelectionParticipantEstado =
  | 'aparto'
  | 'seleccionado'
  | 'confirmo_asistencia'
  | 'confirmo_llegada'
  | 'asignado'
  | 'vinculo'
  | 'salida'

/** `Participacion.puesto` enum. */
export type ParticipacionPuesto = 'mesero' | 'barra'

export interface TeamSelectionParticipantViewModel {
  idParticipacion: number
  nombre: string
  puesto: ParticipacionPuesto
  estado: TeamSelectionParticipantEstado
}

/**
 * The only forward transition this screen models
 * (`PATCH /participaciones/{id_participacion}/estado`, restricted to the
 * one value that belongs to the captain here). No reverse transition
 * (`seleccionado → aparto`) exists in the backend's state machine — the
 * PATCH endpoint's own request-body enum never lists `aparto` as a valid
 * target.
 */
export interface SelectParticipantRequest {
  idParticipacion: number
  estado: 'seleccionado'
}

/**
 * Per-row UI state for the selection action — independent of
 * `TeamSelectionParticipantViewModel.estado`, which reflects only the
 * last-fetched server snapshot. `idle`/`selecting`/`error` only ever apply
 * to a candidate (`estado: 'aparto'`) row currently being acted on;
 * `selected` is a transient local flag shown until the roster refetch
 * (triggered by the mutation's cache invalidation) moves the row out of
 * the candidates list for real.
 */
export type TeamSelectionRowStatus = 'idle' | 'selecting' | 'selected' | 'error'
