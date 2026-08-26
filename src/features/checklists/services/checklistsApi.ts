import type {
  ChecklistItemViewModel,
  ChecklistTemplateViewModel,
  ChecklistTipo,
  CreateChecklistInput,
  UpdateChecklistInput,
} from '@/features/checklists/types/checklists'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * WIRE CASING — ASYMMETRIC, confirmed directly against the pinned
 * backend's actual source (not just `docs/api/openapi-sgeb.yaml`, which
 * documents the response shape only and doesn't disagree with either
 * side):
 *
 * - REQUEST (`POST`/`PUT /checklists`): each item's expected-quantity
 *   field must be **camelCase** `cantidadEsperada`
 *   (`checklist_validator.ts`'s `items` schema validates the raw JSON key
 *   `cantidadEsperada` via VineJS — there is no snake_case↔camelCase body
 *   middleware anywhere in the backend, confirmed by inspection). Sending
 *   `cantidad_esperada` instead leaves the required `cantidadEsperada`
 *   key missing, which VineJS's `required` rule rejects as `SGEB-2001`
 *   ("Faltan datos obligatorios") — this was a real, reproduced bug in
 *   this file, fixed here.
 * - RESPONSE (`GET`/every write's returned `Checklist`): the same field
 *   comes back **snake_case** `cantidad_esperada` — the `ChecklistItem`
 *   Lucid model declares `@column({ columnName: 'cantidad_esperada',
 *   serializeAs: 'cantidad_esperada' })`, which governs JSON
 *   serialization independently of the request validator.
 *
 * Every other field (`nombre`, `tipo`, `descripcion`, `orden`) is a single
 * word, so this asymmetry is invisible for them. Every `...Input`/
 * `...ViewModel` type in this app stays camelCase either way (this app's
 * own view-model convention) — only the wire body transforms, same
 * boundary `features/menu/services/menuApi.ts` documents for its own
 * catalog.
 */

interface ChecklistItemApiRecord {
  id_item: number
  id_checklist: number
  descripcion: string
  cantidad_esperada: number
  orden: number
  activo: boolean
}

interface ChecklistApiRecord {
  id_checklist: number
  nombre: string
  tipo: ChecklistTipo
  activo: boolean
  items: ChecklistItemApiRecord[]
}

function mapItem(record: ChecklistItemApiRecord): ChecklistItemViewModel {
  return {
    idItem: record.id_item,
    descripcion: record.descripcion,
    cantidadEsperada: record.cantidad_esperada,
    orden: record.orden,
    activo: record.activo,
  }
}

function mapChecklist(record: ChecklistApiRecord): ChecklistTemplateViewModel {
  return {
    idChecklist: record.id_checklist,
    nombre: record.nombre,
    tipo: record.tipo,
    activo: record.activo,
    items: (record.items ?? []).map(mapItem),
  }
}

/** Request-side only — see the module comment's WIRE CASING note for why `cantidadEsperada` stays camelCase here despite the response using `cantidad_esperada`. */
function mapItemsForWire(items: readonly CreateChecklistInput['items'][number][]) {
  return items.map((item) => ({
    descripcion: item.descripcion,
    cantidadEsperada: item.cantidadEsperada,
    orden: item.orden,
  }))
}

/** `GET /checklists` — `tipo`/`activo` are both optional server-side filters; omitted here means "every type, active only" is NOT assumed — callers pass `activo: false` explicitly to also see deactivated templates (mirrors `fetchInsumos`'s convention). */
export async function fetchChecklists(
  params: { tipo?: ChecklistTipo; activo?: boolean } = {},
  signal?: AbortSignal,
): Promise<ChecklistTemplateViewModel[]> {
  const envelope = await requestSgeb<ChecklistApiRecord[]>({
    url: '/checklists',
    params: {
      ...(params.tipo ? { tipo: params.tipo } : {}),
      ...(params.activo === undefined ? {} : { activo: params.activo }),
    },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapChecklist)
}

/** `POST /checklists` (RF-12). Rejects an empty `items` array (`SGEB-2001`) — enforced client-side too by `checklistSchemas.ts`, but the server is the authority. */
export async function createChecklist(
  input: CreateChecklistInput,
): Promise<ChecklistTemplateViewModel> {
  const envelope = await requestSgeb<ChecklistApiRecord>({
    url: '/checklists',
    method: 'POST',
    data: {
      nombre: input.nombre,
      tipo: input.tipo,
      items: mapItemsForWire(input.items),
    },
  })
  return mapChecklist(envelope.data!)
}

/**
 * `PUT /checklists/{id}` — full replace of the template AND its items
 * (RF-12). Existing `CHECKLIST_INSTANCIA` rows keep the items they were
 * generated with; only future instantiations see the new set. Rejected
 * with `SGEB-4017` if the template has open (`completado=false`) instances
 * in an event that is `publicado`/`en_curso` — surfaced to the caller as an
 * `SgebApplicationError`, never swallowed or pre-checked client-side (no
 * authoritative pre-check endpoint exists).
 */
export async function updateChecklist(
  idChecklist: number,
  input: UpdateChecklistInput,
): Promise<ChecklistTemplateViewModel> {
  const envelope = await requestSgeb<ChecklistApiRecord>({
    url: `/checklists/${String(idChecklist)}`,
    method: 'PUT',
    data: {
      nombre: input.nombre,
      tipo: input.tipo,
      items: mapItemsForWire(input.items),
    },
  })
  return mapChecklist(envelope.data!)
}

/** `DELETE /checklists/{id}` — logical deactivation (`activo=false`). Rejected (409) with open instances in a live event (`SGEB-4016`, same "en uso" family as `deactivateInsumo`). */
export async function deactivateChecklist(idChecklist: number): Promise<void> {
  await requestSgeb<null>({ url: `/checklists/${String(idChecklist)}`, method: 'DELETE' })
}
