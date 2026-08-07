/**
 * UI domain types for W-05 "Seleccionar equipo" — derived from
 * docs/api/openapi-sgeb.yaml v1.6.0's `Participaciones` endpoints.
 *
 * Documentation gap (flagged, not resolved): no dedicated `Participacion`
 * response schema exists anywhere in the OpenAPI document — `GET
 * /eventos/{id_evento}/participaciones` responds with the generic
 * `ExitoLista` envelope. `TeamSelectionParticipantViewModel` is a
 * feature-local synthesis for presentation purposes only, same status as
 * `EventDetailViewModel`/`EventListItemViewModel` (see their own
 * comments) — not a literal documented schema or confirmed backend DTO.
 *
 * Field-by-field sourcing:
 * - idParticipacion: `IdParticipacion` path parameter (`integer, minimum:
 *   1, maximum: 4294967295`) — a positive integer, the same identifier
 *   shape as `IdEvento`. `USUARIO` is the only domain entity with a UUID
 *   public identifier; participations are not `USUARIO` rows.
 * - puesto: `POST /eventos/{id_evento}/participaciones`'s documented
 *   request-body enum (`mesero | barra`) — a real, confirmed domain
 *   concept, even though no GET response schema currently echoes it back.
 * - estado: the subset of the documented 7-value lifecycle
 *   (`aparto → seleccionado → confirmo_asistencia → confirmo_llegada →
 *   asignado → vinculo → salida`) this screen actually shows — only the
 *   first two. Every value beyond `seleccionado` belongs to attendance
 *   (W-06) or later operational screens, explicitly out of scope here.
 * - nombre: NOT part of any documented response schema — a
 *   presentation-only convenience, exactly like
 *   `EventListItemViewModel.capitanNombre`/`WaiterListItemViewModel.
 *   nombreCompleto`. Never a mirror of a real wire field.
 *
 * Deliberately excluded: phone, email, rating, attendance percentage,
 * experience years, photo URL, payment/bank data, an internal numeric
 * `id_usuario`, or any captain/UUID identifier — none of these appear in
 * any documented source for this screen.
 */

/** The subset of the documented `estado` lifecycle this screen renders. */
export type TeamSelectionParticipantEstado = 'aparto' | 'seleccionado'

/** `POST /eventos/{id_evento}/participaciones`'s documented `puesto` enum. */
export type ParticipacionPuesto = 'mesero' | 'barra'

export interface TeamSelectionParticipantViewModel {
  idParticipacion: number
  nombre: string
  puesto: ParticipacionPuesto
  estado: TeamSelectionParticipantEstado
}

/**
 * The only forward transition this screen models
 * (`PATCH /participaciones/{id_participacion}/estado`'s documented
 * request body, restricted to the one value that belongs to the
 * captain). No reverse transition (`seleccionado → aparto`) exists in the
 * current contract — the PATCH endpoint's own request-body enum never
 * lists `aparto` as a valid target.
 */
export interface SelectParticipantRequest {
  idParticipacion: number
  estado: 'seleccionado'
}

/**
 * Per-row UI state for the selection action — independent of
 * `TeamSelectionParticipantViewModel.estado`, which reflects only the
 * fixture's baseline. `idle`/`selecting`/`error` only ever apply to a
 * candidate (`estado: 'aparto'`) row currently being acted on; `selected`
 * is the terminal state once a demo selection succeeds.
 */
export type TeamSelectionRowStatus = 'idle' | 'selecting' | 'selected' | 'error'
