/**
 * UI domain types for the global checklist template catalog — Phase 3 of
 * `feature/checklist-flow-alignment`. Confirmed against the pinned backend
 * (`app/modules/checklists/`) and `docs/api/openapi-sgeb.yaml` v1.20.
 *
 * Scope: `Checklist`/`ChecklistItem` are GLOBAL catalog entities (no
 * `id_evento`), same as `Insumo`/`Bebida`/`Envase` in `features/menu`. This
 * feature only manages the reusable TEMPLATE — instantiating one against a
 * participation (`POST /participaciones/{id}/checklist-instancias`) is a
 * captain action surfaced from `features/events/montage` instead (the one
 * screen that already has a participation in context), not duplicated here.
 *
 * Only `tipo: 'montaje'` has any automatic downstream effect (approving a
 * montaje instance sets `checklist_ok`, unlocking mesa assignment —
 * `features/events/montage`). `servicio`/`cierre` templates are managed
 * identically here but never treated as equivalent to `montaje` outside
 * this catalog.
 */

export type ChecklistTipo = 'montaje' | 'servicio' | 'cierre'

export interface ChecklistItemViewModel {
  idItem: number
  descripcion: string
  cantidadEsperada: number
  orden: number
  /** Logically deactivated, not deleted — `GET /checklists/{id}` (unlike the list endpoint) returns inactive items too, so an edit form can show/replace the full historical set. */
  activo: boolean
}

export interface ChecklistTemplateViewModel {
  idChecklist: number
  nombre: string
  tipo: ChecklistTipo
  activo: boolean
  items: readonly ChecklistItemViewModel[]
}

export interface ChecklistItemInput {
  descripcion: string
  cantidadEsperada: number
  orden: number
}

export interface CreateChecklistInput {
  nombre: string
  tipo: ChecklistTipo
  items: readonly ChecklistItemInput[]
}

/** `PUT /checklists/{id}` replaces the whole template — same shape as create, never a partial patch (backend `actualizar` requires `nombre`/`tipo`/`items` all present). */
export type UpdateChecklistInput = CreateChecklistInput
