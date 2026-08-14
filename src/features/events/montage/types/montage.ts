/**
 * UI domain types for W-07 "Verificar montaje + asignar mesas" — the
 * CAPTAIN'S WEB VIEW of montage checklists and table assignment.
 *
 * `feature/montage-live-integration` status (verified against the pinned
 * backend, `sgeb-backend@2b99e89`, not just `docs/api/openapi-sgeb.yaml`):
 *
 *   LIVE:
 *     - `GET /eventos/{id_evento}/participaciones` — roster.
 *     - `GET /checklists?tipo=montaje` — template item descriptions.
 *     - `GET /participaciones/{id_participacion}/checklist-instancias` —
 *       per-participant checklist read.
 *     - `PATCH /checklist-instancias/{id}/aprobar` — captain approval.
 *   FOUNDATION-ONLY (deliberately NOT live in this branch — see below):
 *     - Table availability + assignment/release. `tables` and
 *       `assignedTables` are local, in-memory demo state only, exactly as
 *       before this branch; `POST /participaciones/{id}/asignaciones` and
 *       `DELETE /asignaciones/{id_asignacion}` are never called from this
 *       screen.
 *
 * **Why table assignment stays foundation-only — a confirmed backend gap,
 * not a frontend choice:**
 * There is no backend endpoint anywhere (checked `start/routes.ts` and
 * every controller/service in `app/modules/participaciones/`) that lists
 * existing `AsignacionMesa` rows — not per event, not per participation.
 * `ParticipacionEvento` has no relation to it, `GET
 * /participaciones/{id_participacion}` only ever preloads `usuario`, and
 * `GET /eventos/{id_evento}/mesas` cannot substitute for it either:
 * `ParticipacionService.asignarMesa` (`participacion_service.ts:292-343`)
 * creates the `AsignacionMesa` row with `vinculada: false` and **never
 * touches `mesa.estado`** — only the mesero's own
 * `PATCH /asignaciones/{id}/vincular` (physically scanning the table's QR,
 * a mobile-only action never called from this web screen) sets
 * `mesa.estado = 'ocupada'`. `SGEB-4006` ("mesa ya asignada") only fires
 * against an existing `vinculada: true` row, so the backend itself allows
 * assigning the same not-yet-scanned mesa to two different meseros. This
 * means `mesa.estado` cannot be used as a proxy for "already
 * captain-assigned" either — there is no honest live signal for that at
 * all. Building live assign/release against this would risk silently
 * double-assigning a table or showing stale/wrong "assigned to" state on
 * every page reload. Confirmed, reported gap (not filed here as
 * speculation): a captain-facing read endpoint for current `AsignacionMesa`
 * state, scoped by event and/or participation, is needed before this half
 * of the screen can go live. Tracked as a backend follow-up ask — see this
 * feature's README section / the branch's final report.
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

/**
 * `GET /eventos/{id_evento}/mesas`'s documented status enum — no other
 * value is authoritative. Read live only for the (foundation-only) table
 * section's initial demo seed; see the module comment for why per-mesero
 * assignment stays local/demo state regardless.
 */
export type MesaEstado = 'libre' | 'ocupada'

export interface EventTableViewModel {
  idMesa: number
  etiqueta: string
  estado: MesaEstado
}

/**
 * One active table assignment for a participant, in this screen's local
 * FOUNDATION-ONLY demo state — never persisted, never read from the
 * server. `idAsignacion` is a local demo id only (see the module comment's
 * "Why table assignment stays foundation-only" section).
 */
export interface MontageAssignmentViewModel {
  idAsignacion: number
  mesa: EventTableViewModel
}

/** `puesto` — `Participacion.puesto`, the documented `mesero | barra` enum. */
export type MontagePuesto = 'mesero' | 'barra'

/**
 * The live roster projection this screen needs, before per-participant
 * checklist data is joined in — `services/montageApi.ts`'s
 * `fetchMontageParticipants` return shape. `checklistOk` is
 * `Participacion.checklist_ok`, needed to resolve `status: 'approved'` (see
 * the module comment).
 */
export interface MontageRosterParticipant {
  idParticipacion: number
  nombre: string
  puesto: MontagePuesto
  checklistOk: boolean
}

export interface MontageParticipantViewModel {
  idParticipacion: number
  nombre: string
  puesto: MontagePuesto
  /** Absent when no checklist instance has been created for this participation yet. */
  checklist?: MontageChecklistViewModel
  /** FOUNDATION-ONLY local demo state — see the module comment. */
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

/** Per-participant UI state for the live approve-checklist action. */
export type ChecklistApprovalStatus = 'idle' | 'approving' | 'error'

/**
 * `POST /participaciones/{id_participacion}/asignaciones`'s exact
 * documented request body — `id_mesa` only. Never actually sent in this
 * branch (see the module comment); kept because the foundation-only
 * handler in `EventMontagePage` still models the same request shape
 * locally, exactly as before this branch.
 */
export interface AssignTableRequest {
  idParticipacion: number
  idMesa: number
}

/** `DELETE /asignaciones/{id_asignacion}`'s documented shape. Never actually sent in this branch — see the module comment. */
export interface ReleaseAssignmentRequest {
  idAsignacion: number
}
