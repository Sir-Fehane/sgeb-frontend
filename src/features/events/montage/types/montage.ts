/**
 * UI domain types for W-07 "Verificar montaje + asignar mesas" — the
 * CAPTAIN'S WEB VIEW of montage checklists and table assignment, derived
 * from docs/api/openapi-sgeb.yaml v1.6.0's `Checklists` and
 * `Participaciones` endpoints.
 *
 * Documentation gap (flagged, not resolved): no dedicated `ChecklistInstancia`,
 * `Mesa`, or `AsignacionMesa` response schema exists anywhere in the
 * OpenAPI document — same status as `EventDetailViewModel`/
 * `TeamSelectionParticipantViewModel`/`EventAttendanceParticipantViewModel`
 * (see their own comments). These types are this feature's own
 * presentation synthesis of the documented request/response shapes, not a
 * claimed literal API DTO.
 *
 * Critical correction to a naive "one checklist per event" reading:
 * `GET/POST /participaciones/{id_participacion}/checklist-instancias` is
 * scoped to a single PARTICIPACIÓN, not the whole event — each mesero has
 * their own montage checklist instance, and the SGEB-4005 approval gate is
 * evaluated per participant. `MontageChecklistViewModel` is therefore
 * nested under `MontageParticipantViewModel`, never a single page-level
 * checklist.
 *
 * Read vs. mutation ownership for this screen's future live integration
 * (nothing below is implemented in this branch — fixtures only):
 *
 *   READ (captain, this screen):
 *     - `GET /participaciones/{id_participacion}/checklist-instancias` —
 *       "Alimenta la pantalla de montaje del mesero y la vista de
 *       aprobación del capitán": explicitly documented as feeding BOTH the
 *       mesero's own montage screen and this captain approval view.
 *     - `GET /eventos/{id_evento}/mesas`
 *   CAPTAIN MUTATIONS (this screen's own actions):
 *     - `PATCH /checklist-instancias/{id}/aprobar`
 *     - `POST /participaciones/{id}/asignaciones`
 *     - `DELETE /asignaciones/{id_asignacion}`
 *   MESERO MUTATION (a different actor's screen, never called here):
 *     - `PUT /checklist-instancias/{id}/respuestas` — this is where the
 *       OpenAPI document happens to NAME the `{id_item, cantidad, hecho}`
 *       shape (the only place those field names appear in the spec at
 *       all), but that does not make it this screen's read source. The
 *       captain reads that same data back through the `GET` above, not
 *       through the mesero's own `PUT`.
 *
 * Field-by-field sourcing:
 * - MontageChecklistItemViewModel.descripcion/cantidadEsperada: the
 *   checklist template's documented item shape (`POST /checklists`).
 * - .cantidad/.hecho: field names taken from `PUT
 *   /checklist-instancias/{id}/respuestas`'s documented request body (the
 *   only place the OpenAPI document names them) — but the VALUES this
 *   screen would read in live integration come back through `GET
 *   /participaciones/{id}/checklist-instancias`, never through the PUT
 *   endpoint itself, which is mesero-owned and is never called from this
 *   web panel (see the matrix above).
 * - MontageChecklistViewModel.status: NOT a literal documented field —
 *   synthesized from `completado` (server-computed boolean, mentioned in
 *   the `respuestas` endpoint's description) plus whether `/aprobar` has
 *   been called. `'pending'` = not all items done; `'completed'` = done
 *   but not yet approved; `'approved'` = `PATCH .../aprobar` succeeded.
 *
 *   **Live-integration contract gap (not resolved here):** the current
 *   OpenAPI document and error dictionary confirm the approval OPERATION
 *   (`PATCH .../aprobar`) and the approval PREREQUISITE (SGEB-4005 blocks
 *   assignment when not approved), but neither documents a read-side
 *   field/schema through which the frontend would learn — from `GET
 *   /participaciones/{id}/checklist-instancias` — that a given checklist
 *   instance has ALREADY been approved. No `aprobado` boolean,
 *   `fecha_aprobacion` timestamp, or `estado`/`status` enum value is named
 *   anywhere in `docs/api/openapi-sgeb.yaml` v1.6 (verified by a direct
 *   text search of the document, not assumed); the data dictionary PDF
 *   could not be inspected in this environment (no `poppler-utils`, same
 *   limitation as the W-07 wireframe — see the README). This frontend's
 *   `'approved'` status is therefore a FIXTURE-BACKED PRESENTATION STATE
 *   only, standing in for a real field that a future live-integration
 *   branch will need to either find in an updated contract or ask the
 *   backend team to add.
 * - EventTableViewModel.estado: `GET /eventos/{id}/mesas`'s documented
 *   enum, confirmed as exactly `libre | ocupada` — no other value exists
 *   in any authoritative source. `codigo_qr`/`token_comensal` are
 *   deliberately never modeled here (no captain-facing purpose, and
 *   showing them is explicitly out of scope).
 * - MontageAssignmentViewModel.idAsignacion: a LOCAL DEMO identifier only.
 *   The data dictionary documents `id_asignacion` as server/DB-generated,
 *   autoincremental, and never client-editable; this frontend never
 *   generates a real one and never will — `idAsignacion` here exists
 *   purely so this fixture-mode UI has a stable local key to demonstrate
 *   assign → release. It is never part of `AssignTableRequest` (the
 *   documented `POST /participaciones/{id}/asignaciones` body is `id_mesa`
 *   only — see below), and during live integration this local counter
 *   would be deleted entirely and replaced by whatever identifier the
 *   real `POST` response returns for the newly created assignment.
 *
 * Deliberately excluded: any `puesto`-based assignment eligibility rule.
 * `POST /participaciones/{id}/asignaciones`'s summary text reads "Asignar
 * mesa a un mesero", which is suggestive but not a documented validation
 * or rejection code — this foundation does not invent a `barra` block (see
 * the README's contract-gap note).
 */

export type MontageChecklistStatus = 'pending' | 'completed' | 'approved'

export interface MontageChecklistItemViewModel {
  idItem: number
  descripcion: string
  cantidadEsperada: number
  cantidad: number
  hecho: boolean
}

export interface MontageChecklistViewModel {
  idChecklistInstancia: number
  nombre: string
  status: MontageChecklistStatus
  items: readonly MontageChecklistItemViewModel[]
}

/** `GET /eventos/{id_evento}/mesas`'s documented status enum — no other value is authoritative. */
export type MesaEstado = 'libre' | 'ocupada'

export interface EventTableViewModel {
  idMesa: number
  etiqueta: string
  estado: MesaEstado
}

/** One active table assignment for a participant — `idAsignacion` is a local demo id only (see module comment). */
export interface MontageAssignmentViewModel {
  idAsignacion: number
  mesa: EventTableViewModel
}

export interface MontageParticipantViewModel {
  idParticipacion: number
  nombre: string
  puesto: 'mesero' | 'barra'
  /** Absent when no checklist instance has been created for this participation yet. */
  checklist?: MontageChecklistViewModel
  assignedTables: readonly MontageAssignmentViewModel[]
}

/**
 * `PATCH /checklist-instancias/{id}/aprobar`'s documented shape — no
 * request body beyond identifying the instance. Only ever invoked when
 * `status === 'completed'`; SGEB-4005 ("checklist incompleto no puede
 * aprobarse") is honored locally by never enabling this for any other
 * status, never by a captain override.
 */
export interface ApproveChecklistRequest {
  idParticipacion: number
  idChecklistInstancia: number
}

/**
 * `POST /participaciones/{id_participacion}/asignaciones`'s exact
 * documented request body — `id_mesa` only, nothing invented beyond it.
 */
export interface AssignTableRequest {
  idParticipacion: number
  idMesa: number
}

/** `DELETE /asignaciones/{id_asignacion}`'s documented shape — a real, captain-owned release action. */
export interface ReleaseAssignmentRequest {
  idAsignacion: number
}
