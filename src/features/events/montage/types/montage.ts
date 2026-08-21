/**
 * UI domain types for W-07 "Verificar montaje + asignar mesas" — the
 * CAPTAIN'S WEB VIEW of montage checklists and table assignment.
 *
 * `feature/event-operations-live` status (verified against the pinned
 * backend, `sgeb-backend@cf1c316d`):
 *
 *   LIVE:
 *     - `GET /eventos/{id_evento}/participaciones` — roster.
 *     - `GET /checklists?tipo=montaje` — template item descriptions.
 *     - `GET /participaciones/{id_participacion}/checklist-instancias` —
 *       per-participant checklist read.
 *     - `PATCH /checklist-instancias/{id}/aprobar` — captain approval.
 *     - `GET /eventos/{id_evento}/asignaciones` — table assignment readback.
 *     - `POST /participaciones/{id_participacion}/asignaciones` — assign a
 *       table (`useAssignTableMutation`).
 *     - `DELETE /asignaciones/{id_asignacion}` — release a table
 *       (`useReleaseAssignmentMutation`).
 *   READ-ONLY BY DESIGN — a confirmed role boundary, not a gap:
 *     - `PATCH /asignaciones/{id_asignacion}/vincular`. Route middleware
 *       restricts this to role `mesero` only (`start/routes.ts`); a
 *       captain/admin token gets `SGEB-1004`. It is also how the mesero's
 *       device proves physical presence (`codigo_qr` must match the
 *       scanned table). This screen only ever displays `vinculada` state —
 *       it never triggers this transition.
 *
 * **Deriving "who currently has which table" — v1.13 explicit truth:**
 * `AsignacionMesa` now carries an explicit `activa` flag (plus
 * `fecha_liberacion`), orthogonal to `vinculada`: `activa=true` means the
 * row is a current assignment (linked or not); `activa=false` means
 * released/historical. Rows are still never deleted — release is a
 * soft-release — but the row itself now says which it is, confirmed at the
 * model/migration/test level on the pinned backend. `GET
 * /eventos/{id_evento}/asignaciones` defaults to `activa=true` only.
 * `utils/deriveMontageAssignments.ts` derives "current table" purely from
 * this field — no cross-referencing against `Participacion.estado`, which
 * was the pre-v1.13 workaround for the ambiguity `activa` now resolves
 * server-side. See this branch's report.
 *
 * Critical correction to a naive "one checklist per event" reading:
 * `GET/POST /participaciones/{id_participacion}/checklist-instancias` is
 * scoped to a single PARTICIPACIÓN, not the whole event — each mesero has
 * their own montage checklist instance, and the SGEB-4005 approval gate is
 * evaluated per participant. `MontageChecklistViewModel` is therefore
 * nested under `MontageParticipantViewModel`, never a single page-level
 * checklist.
 *
 * **`checklist_ok` vs `completado` — kept permanently distinct (ADR-010,
 * `docs/decisions.md`), confirmed at the backend code level too:**
 * `ChecklistInstancia.completado` is server-computed per instance from its
 * `respuestas` (`checklist_service.ts`'s `responder`); it means nothing
 * about approval. `Participacion.checklist_ok` is a participation-level
 * aggregate, written in exactly one place —
 * `ChecklistService.aprobar` (`checklist_service.ts:296-355`) — and ONLY
 * when the approved instance's template `tipo === 'montaje'`. There is no
 * per-instance "approved" column anywhere in the database
 * (`checklist_instancia`'s only columns are `id_instancia`,
 * `id_participacion`, `id_checklist`, `completado`, `fecha`). This
 * feature's `status: 'approved'` is therefore derived as
 * `completado && checklistOk` — safe precisely because this screen only
 * ever resolves the one `tipo: 'montaje'` instance per participant (see
 * `services/montageApi.ts`'s `buildMontageChecklist`), never a
 * `servicio`/`cierre` instance. It must never be read as "this specific
 * instance was approved, or when" — that per-instance fact does not exist
 * in the API or the database (ADR-010).
 *
 * Field-by-field sourcing (live):
 * - MontageChecklistItemViewModel.descripcion/cantidadEsperada: joined
 *   client-side from the checklist TEMPLATE's items
 *   (`GET /checklists?tipo=montaje`), matched by `id_item` — the instance
 *   read (`GET /participaciones/{id}/checklist-instancias`) only returns
 *   `respuestas[].{id_item, cantidad, hecho}`, never a description.
 * - .cantidad/.hecho: `ChecklistRespuesta.cantidad`/`.hecho`, live.
 * - MontageChecklistViewModel.status: 'pending' when `!completado`;
 *   'completed' when `completado && !checklistOk`; 'approved' when
 *   `completado && checklistOk` (see the ADR-010 note above).
 *
 * Deliberately excluded: any `puesto`-based assignment eligibility rule —
 * `POST /participaciones/{id}/asignaciones`'s summary text reads "Asignar
 * mesa a un mesero", which is suggestive but not a documented validation
 * or rejection code.
 */

/** `Participacion.estado` — the confirmed linear state machine (`participacion_service.ts`'s `TRANSICIONES`). The enumerated order IS the valid sequence; `salida` is terminal. */
export type ParticipacionEstado =
  | 'aparto'
  | 'seleccionado'
  | 'confirmo_asistencia'
  | 'confirmo_llegada'
  | 'asignado'
  | 'vinculo'
  | 'salida'

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

/**
 * A resolved current table assignment — the output of
 * `deriveMontageAssignments`, shared by both the participant-keyed and
 * mesa-keyed views so there is exactly one shape for "who has which
 * table," never two independently-drifting projections of the same fact.
 */
export interface MontageAssignmentViewModel {
  idAsignacion: number
  idParticipacion: number
  idMesa: number
  nombreMesero: string
  etiquetaMesa: string
  /** `true` once the mesero has scanned the mesa's real QR (`PATCH /asignaciones/{id}/vincular`) — read-only here, see the module comment. */
  vinculada: boolean
}

export interface EventTableViewModel {
  idMesa: number
  etiqueta: string
  estado: MesaEstado
  /** Absent when no participant currently has this table (see the module comment's derivation rule). */
  currentAssignment?: MontageAssignmentViewModel
}

/** `puesto` — `Participacion.puesto`, the documented `mesero | barra` enum. */
export type MontagePuesto = 'mesero' | 'barra'

/**
 * The live roster projection this screen needs, before per-participant
 * checklist/assignment data is joined in — `services/montageApi.ts`'s
 * `fetchMontageParticipants` return shape. `checklistOk` is
 * `Participacion.checklist_ok`, needed to resolve `status: 'approved'` (see
 * the module comment). `estado` is `Participacion.estado`, needed both for
 * the assign-eligibility copy and for `deriveMontageAssignments`.
 */
export interface MontageRosterParticipant {
  idParticipacion: number
  nombre: string
  puesto: MontagePuesto
  estado: ParticipacionEstado
  checklistOk: boolean
}

export interface MontageParticipantViewModel {
  idParticipacion: number
  nombre: string
  puesto: MontagePuesto
  estado: ParticipacionEstado
  /** Absent when no checklist instance has been created for this participation yet. */
  checklist?: MontageChecklistViewModel
  /** Absent when this participant has no current table (see the module comment's derivation rule). */
  currentAssignment?: MontageAssignmentViewModel
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

/** Per-participant UI state for the live approve-checklist action. */
export type ChecklistApprovalStatus = 'idle' | 'approving' | 'error'

/** `POST /participaciones/{id_participacion}/asignaciones`'s exact documented request body — `id_mesa` only. */
export interface AssignTableRequest {
  idParticipacion: number
  idMesa: number
}

/**
 * `DELETE /asignaciones/{id_asignacion}`'s documented shape, plus
 * `idParticipacion` — not sent to the server, only carried alongside so
 * `EventMontagePage` can key its per-row pending/error state by
 * participant the same way `handleAssignTable`/`handleApproveChecklist`
 * already do (the caller always knows it, from the same
 * `currentAssignment` the release button is rendered from).
 */
export interface ReleaseAssignmentRequest {
  idAsignacion: number
  idParticipacion: number
}
