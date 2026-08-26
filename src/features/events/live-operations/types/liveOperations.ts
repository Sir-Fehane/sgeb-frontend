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
  /** Absent when no `tipo: 'cierre'` checklist instance has been created for this participation yet. See `ClosureChecklistViewModel`'s own comment for what this can and cannot tell the captain. */
  closureChecklist?: ClosureChecklistViewModel
}

/**
 * The exit ("checklist de salida") checklist — a `tipo: 'cierre'` template
 * instantiated against one participación, reusing the exact same
 * `CHECKLIST`/`CHECKLIST_INSTANCIA` machinery `features/events/montage`
 * already wires for `tipo: 'montaje'` (`POST /participaciones/{id}/
 * checklist-instancias`, `PUT /checklist-instancias/{id}/respuestas`
 * from the mesero app, `PATCH /checklist-instancias/{id}/aprobar`).
 *
 * **This checklist now gates checkout — confirmed against the pinned
 * backend authority SHA (`143549d6acecb52bbb5cb300c474dd562409cfc7`,
 * `app/modules/participaciones/services/participacion_service.ts`'s
 * `verificarChecklistCierre`, added in migration
 * `1800000017_checklist_instancia_aprobacion`):**
 *   - `PATCH /participaciones/{id}/estado` → `salida`
 *     (`ParticipacionService.cambiarEstado`) now requires a `tipo: 'cierre'`
 *     instance for the participation that is both `completado: true` AND
 *     approved (`aprobado_en` non-null). Missing, incomplete, or
 *     unapproved all reject the transition with `SGEB-4027`.
 *   - This supersedes a PREVIOUS backend state (audited on an earlier
 *     branch) where `vinculo → salida` succeeded purely on state-machine
 *     order and this checklist was advisory-only. That assumption is now
 *     stale — do not resurrect it. See `utils/liveOperationsPresentation.ts`'s
 *     `isClosureChecklistApprovedForSalida`/`getSalidaBlockReason` for the
 *     frontend gate that mirrors this rule, and
 *     `queries/useMarkParticipantSalidaMutation.ts` for how a stale-state
 *     `SGEB-4027` (the gate raced by a concurrent change) is still handled
 *     safely even though the UI also disables the action locally.
 *
 * `status` now DOES represent "aprobado", backed by a real persisted
 * column: `checklist_instancia.aprobado_en`, a nullable timestamp added by
 * migration `1800000017_checklist_instancia_aprobacion` — set by
 * `ChecklistService.aprobar` for every checklist type (unlike
 * `Participacion.checklist_ok`, which stays montaje-only, per that
 * migration's own design note: "no overload montage-specific checklist_ok
 * with a different meaning"). `GET /participaciones/{id}/
 * checklist-instancias` now returns this field, so it is available on a
 * plain resync (reload/reconnect/refetch) — never only from a transient
 * `checklist:cambio` socket payload. `buildClosureChecklist`
 * (`services/liveOperationsApi.ts`) maps it into `aprobadoEn` below and
 * derives `status` the same three-way way montage's own
 * `buildMontageChecklist` derives `MontageChecklistStatus` — mirrored
 * naming, different source field (`aprobadoEn` here, `checklistOk` there):
 * `'pending'` when `!completado`; `'completed'` when `completado &&
 * !aprobadoEn`; `'approved'` when `completado && aprobadoEn`.
 */
export type ClosureChecklistStatus = 'pending' | 'completed' | 'approved'

export interface ClosureChecklistItemViewModel {
  idItem: number
  descripcion: string
  cantidadEsperada: number
  cantidad: number
  hecho: boolean
}

export interface ClosureChecklistViewModel {
  idChecklistInstancia: number
  idChecklist: number
  nombre: string
  status: ClosureChecklistStatus
  /** `checklist_instancia.aprobado_en`, unmapped beyond its wire type — `null` until approved, an ISO timestamp after. `status === 'approved'` is the derived, ready-to-render form of this; kept here too so a consumer that needs the actual approval moment (not just the boolean fact) has it without re-deriving from the raw API record. */
  aprobadoEn: string | null
  /** Count of `respuestas` with `hecho: false` — mirrors `PUT .../respuestas`'s own `pendientes` response field, computed the same way here from the GET read. */
  pendientes: number
  items: readonly ClosureChecklistItemViewModel[]
}

/** `POST /participaciones/{id_participacion}/checklist-instancias`, restricted to `tipo: 'cierre'` templates by the caller (`useClosureChecklistTemplatesQuery`'s `tipo` filter) — the endpoint itself has no `tipo` restriction. Idempotent, same as montage's `InstantiateChecklistRequest`. */
export interface InstantiateClosureChecklistRequest {
  idParticipacion: number
  idChecklist: number
}

export type ClosureChecklistInstantiationStatus = 'idle' | 'instantiating' | 'error'

/** `PATCH /checklist-instancias/{id}/aprobar` — no request body beyond identifying the instance, same endpoint montage's `ApproveChecklistRequest` targets. */
export interface ApproveClosureChecklistRequest {
  idParticipacion: number
  idChecklistInstancia: number
}

/**
 * Per-participant UI state for the live approve action itself — the
 * in-flight/error state of the `PATCH .../aprobar` call. Deliberately has
 * NO `'approved'` value: unlike before this branch, approval now persists
 * (`checklist_instancia.aprobado_en`), so "was this approved" is answered
 * by the real, refetched `ClosureChecklistViewModel.status === 'approved'`
 * (`LiveOperationsClosureChecklistSection` reads that directly) — never by
 * a local flag held after the mutation resolves. On success this resets to
 * `'idle'`, same as `LiveOperationsRowStatus` after a successful `salida`
 * mutation; the invalidation-triggered refetch is what actually moves the
 * badge.
 */
export type ClosureChecklistApprovalStatus = 'idle' | 'approving' | 'error'

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
