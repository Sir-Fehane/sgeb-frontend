import type { UsuarioBreveApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
import type {
  MontageChecklistViewModel,
  MontagePuesto,
  MontageRosterParticipant,
  ParticipacionEstado,
} from '@/features/events/montage/types/montage'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of `GET /eventos/{id_evento}/participaciones` (`Participacion`
 * schema) — the same endpoint Team Selection/Attendance already consume
 * live, projected for this screen's own needs (`checklist_ok`, which
 * neither of those two features' own `ParticipacionApiRecord` requests).
 * Reuses `UsuarioBreveApiRecord` rather than redeclaring it, per
 * `docs/FrontendArchitecture.md` §17's "prefer one shared transport DTO
 * boundary plus feature-specific mapping where needed."
 */
export interface ParticipacionApiRecord {
  id_participacion: number
  puesto: MontagePuesto
  estado: ParticipacionEstado
  checklist_ok: boolean
  usuario: UsuarioBreveApiRecord
}

/** Wire shape of one item inside a `Checklist` template's `items` array. */
export interface ChecklistItemApiRecord {
  id_item: number
  id_checklist: number
  descripcion: string
  cantidad_esperada: number
  orden: number
  activo: boolean
}

/** Wire shape of `GET /checklists` (`Checklist` schema). */
export interface ChecklistApiRecord {
  id_checklist: number
  nombre: string
  tipo: 'montaje' | 'servicio' | 'cierre'
  activo: boolean
  items: ChecklistItemApiRecord[]
}

/** Wire shape of one row inside a `ChecklistInstancia`'s `respuestas` array. */
export interface ChecklistRespuestaApiRecord {
  id_respuesta: number
  id_instancia: number
  id_item: number
  cantidad: number
  hecho: boolean
}

/**
 * Wire shape of `GET /participaciones/{id_participacion}/checklist-instancias`
 * (`ChecklistInstancia` schema, array). `completado` is server-computed —
 * never declared by this or any captain-facing client.
 */
export interface ChecklistInstanciaApiRecord {
  id_instancia: number
  id_participacion: number
  id_checklist: number
  completado: boolean
  fecha: string
  respuestas: ChecklistRespuestaApiRecord[]
}

/**
 * Wire shape of `PATCH /checklist-instancias/{id}/aprobar`'s response —
 * confirmed by direct backend inspection (`checklist_service.ts:339-354`)
 * to be RICHER than `docs/api/openapi-sgeb.yaml` documents (the OpenAPI
 * doc claims the response is a bare `ChecklistInstancia`). Reported
 * mismatch — see this branch's final report. `desbloquea_asignacion` is
 * `true` only when the approved instance's template `tipo === 'montaje'`;
 * for `servicio`/`cierre` templates the call still succeeds (HTTP 200) but
 * writes nothing to the database.
 */
export interface AprobarChecklistApiRecord {
  instancia: ChecklistInstanciaApiRecord
  tipo: 'montaje' | 'servicio' | 'cierre'
  desbloquea_asignacion: boolean
}

/** A `Checklist` template projected to only what this screen needs to join against instance data: its display name and its items' descriptions/expected quantities, keyed by `id_item`. */
export interface ChecklistTemplateViewModel {
  idChecklist: number
  nombre: string
  items: ReadonlyMap<number, { descripcion: string; cantidadEsperada: number }>
}

/** Same join `team-selection/services/teamSelectionApi.ts`'s `nombreCompleto` documents. */
function nombreCompleto(usuario: UsuarioBreveApiRecord): string {
  const apellidos = usuario.apellido_materno
    ? `${usuario.apellido_paterno} ${usuario.apellido_materno}`
    : usuario.apellido_paterno
  return `${usuario.nombre} ${apellidos}`
}

/**
 * Fetches the event roster and narrows it to this screen's scope:
 * participants who have at least been selected (`estado !== 'aparto'`) —
 * a not-yet-selected candidate belongs to Team Selection, not Montage.
 * Mirrors `attendanceApi.ts`'s `fetchAttendanceParticipants` narrowing
 * reasoning. No `estado` query filter is sent to the server, matching the
 * existing live Team Selection/Attendance convention. `estado` itself is
 * surfaced on the returned view model — needed both for assign-eligibility
 * copy and `deriveMontageAssignments` (see `types/montage.ts`'s module
 * comment).
 */
export async function fetchMontageParticipants(
  idEvento: number,
  signal?: AbortSignal,
): Promise<MontageRosterParticipant[]> {
  const envelope = await requestSgeb<ParticipacionApiRecord[]>({
    url: `/eventos/${String(idEvento)}/participaciones`,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? [])
    .filter((record) => record.estado !== 'aparto')
    .map((record) => ({
      idParticipacion: record.id_participacion,
      nombre: nombreCompleto(record.usuario),
      puesto: record.puesto,
      estado: record.estado,
      checklistOk: record.checklist_ok,
    }))
}

/**
 * Fetches every active `montaje`-type checklist template with its items,
 * projected into a lookup keyed by `id_checklist`. This screen only ever
 * needs `montaje`-type templates (never `servicio`/`cierre` — see
 * `types/montage.ts`'s module comment), so the server-side `tipo` filter
 * does the narrowing instead of fetching every template and filtering
 * client-side.
 */
export async function fetchMontageChecklistTemplates(
  signal?: AbortSignal,
): Promise<ChecklistTemplateViewModel[]> {
  const envelope = await requestSgeb<ChecklistApiRecord[]>({
    url: '/checklists',
    params: { tipo: 'montaje' },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map((checklist) => ({
    idChecklist: checklist.id_checklist,
    nombre: checklist.nombre,
    items: new Map(
      checklist.items.map((item) => [
        item.id_item,
        { descripcion: item.descripcion, cantidadEsperada: item.cantidad_esperada },
      ]),
    ),
  }))
}

/**
 * Fetches one participation's checklist instances, unmapped — building the
 * final `MontageChecklistViewModel` needs both this AND the templates
 * lookup above (`buildMontageChecklist`, below), so no view-model mapping
 * happens here.
 */
export async function fetchChecklistInstancias(
  idParticipacion: number,
  signal?: AbortSignal,
): Promise<ChecklistInstanciaApiRecord[]> {
  const envelope = await requestSgeb<ChecklistInstanciaApiRecord[]>({
    url: `/participaciones/${String(idParticipacion)}/checklist-instancias`,
    ...(signal ? { signal } : {}),
  })
  return envelope.data ?? []
}

/**
 * Joins one participation's checklist instances against the `montaje`
 * templates lookup to build this screen's single checklist view model.
 * Picks the first instance whose `id_checklist` matches a known montaje
 * template — in practice there is exactly one such template, so exactly
 * one instance can match. Returns `undefined` when no instance has been
 * created for this participation yet, or when its only instance(s) belong
 * to a `servicio`/`cierre` template (out of scope for this screen) or to a
 * since-deactivated montaje template (`GET /checklists` only returns
 * `activo: true` templates, so a deactivated one's items are honestly
 * unavailable here — a rare admin-only edge case, not a fabricated
 * fallback).
 *
 * `status` is `completado && checklistOk` for `'approved'` — safe here
 * specifically because this is always the participation's one `montaje`
 * instance (see `types/montage.ts`'s ADR-010 note); never generalize this
 * derivation to a `servicio`/`cierre` instance.
 */
export function buildMontageChecklist(
  instancias: readonly ChecklistInstanciaApiRecord[],
  templatesById: ReadonlyMap<number, ChecklistTemplateViewModel>,
  checklistOk: boolean,
): MontageChecklistViewModel | undefined {
  const instancia = instancias.find((candidate) =>
    templatesById.has(candidate.id_checklist),
  )
  if (!instancia) {
    return undefined
  }
  const template = templatesById.get(instancia.id_checklist)
  if (!template) {
    return undefined
  }

  return {
    idChecklistInstancia: instancia.id_instancia,
    nombre: template.nombre,
    status: !instancia.completado ? 'pending' : checklistOk ? 'approved' : 'completed',
    items: instancia.respuestas.map((respuesta) => {
      const templateItem = template.items.get(respuesta.id_item)
      return {
        idItem: respuesta.id_item,
        descripcion: templateItem?.descripcion ?? `Ítem ${String(respuesta.id_item)}`,
        cantidadEsperada: templateItem?.cantidadEsperada ?? respuesta.cantidad,
        cantidad: respuesta.cantidad,
        hecho: respuesta.hecho,
      }
    }),
  }
}

/**
 * `POST /participaciones/{id_participacion}/checklist-instancias` (RF-19)
 * — the captain applies a `montaje` template to a participant who doesn't
 * have one instanced yet. **Idempotent** (confirmed
 * `checklist_service.ts`'s `instanciar`): calling this again for the same
 * participation/template pair returns the same existing instance rather
 * than creating a duplicate, so a caller never needs to guard against
 * double-submission client-side beyond the normal in-flight disable.
 */
export async function instantiateChecklist(
  idParticipacion: number,
  idChecklist: number,
): Promise<ChecklistInstanciaApiRecord> {
  const envelope = await requestSgeb<ChecklistInstanciaApiRecord>({
    url: `/participaciones/${String(idParticipacion)}/checklist-instancias`,
    method: 'POST',
    data: { id_checklist: idChecklist },
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return envelope.data
}

/**
 * `PATCH /checklist-instancias/{id}/aprobar` — the one real captain
 * mutation this screen performs. No request body (confirmed against the
 * pinned backend: the controller reads only the URL param). The caller
 * (`useApproveChecklistMutation`) never reads this response's fields
 * directly — the actual effect (`Participacion.checklist_ok`) is only
 * observable by invalidating and re-reading the roster query, per
 * `types/montage.ts`'s ADR-010 note — but the full shape is still typed
 * and returned for fidelity/testability.
 */
export async function approveChecklistInstancia(
  idChecklistInstancia: number,
): Promise<AprobarChecklistApiRecord> {
  const envelope = await requestSgeb<AprobarChecklistApiRecord>({
    url: `/checklist-instancias/${String(idChecklistInstancia)}/aprobar`,
    method: 'PATCH',
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful approval
    // always returns the shape above — guarded defensively rather than
    // assumed, same as `selectParticipant`/`fetchEventoDetalle`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return envelope.data
}
