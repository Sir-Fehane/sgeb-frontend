import { isSgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { ParticipacionApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
import type { ChecklistInstanciaApiRecord } from '@/features/events/montage/services/montageApi'
import type { ChecklistTemplateViewModel } from '@/features/checklists/types/checklists'
import type { ClosureChecklistViewModel } from '@/features/events/live-operations/types/liveOperations'

/**
 * `PATCH /participaciones/{id_participacion}/estado` restricted to the one
 * transition this screen performs: `vinculo → salida`. The body is built
 * here rather than accepted as a parameter — this function only ever sends
 * `{ estado: 'salida' }`, never a caller-supplied value.
 *
 * Deliberately reuses Team Selection's `ParticipacionApiRecord` as the
 * response's wire-shape type (only to type-check `requestSgeb`'s generic —
 * no field is ever read from it) rather than declaring a second, identical
 * DTO here: this endpoint and `GET /eventos/{id}/participaciones` share the
 * exact same `Participacion` wire schema, and Team Selection's copy is
 * already the one this branch's roster read goes through (see
 * `queries/useMarkParticipantSalidaMutation.ts`'s own comment on why the
 * GET side is not duplicated either).
 *
 * Resolves to `void`, not a mapped view model: the pinned backend's
 * `ParticipacionService.cambiarEstado` loads the row without preloading
 * `usuario` (confirmed against `participacion_service.ts` — unlike
 * `listarPorEvento`/`obtener`, which do), so this response's `usuario` is
 * absent. Mapping it here the way `teamSelectionApi.ts`'s `selectParticipant`
 * does would dereference a field this specific endpoint doesn't actually
 * send — see that latent gap's own writeup in the branch report. The
 * caller doesn't need the returned row anyway — success just triggers a
 * roster invalidation/refetch, which is what actually moves the
 * participant to its terminal presentation (§13/§24 of the branch brief:
 * no optimistic update, server-confirmed success only).
 */
/**
 * Joins one participation's checklist instances (`fetchChecklistInstancias`,
 * reused as-is from `features/events/montage/services/montageApi` — the
 * endpoint is not montaje-specific, only montage's own derivation of it is)
 * against the `tipo: 'cierre'` templates lookup
 * (`useClosureChecklistTemplatesQuery`) to build this screen's exit
 * checklist view model. Mirrors montage's `buildMontageChecklist` shape,
 * with one deliberate difference in `status`'s source: `aprobado_en`
 * (persisted per-instance) rather than `checklist_ok` (participation-level,
 * montaje-only — see `ChecklistInstanciaApiRecord`'s own comment). Picks
 * the first instance whose `id_checklist` matches a known `cierre`
 * template; returns `undefined` when no such instance exists yet (not yet
 * assigned, or its only instance(s) belong to a `montaje`/`servicio`
 * template, out of scope for this screen) — which
 * `getSalidaBlockReason`/`isClosureChecklistApprovedForSalida`
 * (`utils/liveOperationsPresentation.ts`) both treat as "not satisfied",
 * matching the pinned backend's own `SGEB-4027` ("sin checklist de cierre
 * asignado").
 */
export function buildClosureChecklist(
  instancias: readonly ChecklistInstanciaApiRecord[],
  templatesById: ReadonlyMap<number, ChecklistTemplateViewModel>,
): ClosureChecklistViewModel | undefined {
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
  const itemsById = new Map(template.items.map((item) => [item.idItem, item]))

  return {
    idChecklistInstancia: instancia.id_instancia,
    idChecklist: instancia.id_checklist,
    nombre: template.nombre,
    status: !instancia.completado
      ? 'pending'
      : instancia.aprobado_en
        ? 'approved'
        : 'completed',
    aprobadoEn: instancia.aprobado_en,
    pendientes: instancia.respuestas.filter((respuesta) => !respuesta.hecho).length,
    items: instancia.respuestas.map((respuesta) => {
      const templateItem = itemsById.get(respuesta.id_item)
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
 * `SGEB-4027` — the pinned backend's code for "salida rejected: the
 * participation's `cierre` checklist is missing, incomplete, or not yet
 * approved" (`ParticipacionService.cambiarEstado`'s `verificarChecklistCierre`
 * guard). The frontend gate (`isClosureChecklistApprovedForSalida`) should
 * normally prevent this call from ever being attempted, but backend state
 * can go stale between a render and a click — another captain approves,
 * unapproves is not possible, or the checklist query simply hasn't
 * refetched yet. This helper exists so that race is recognized
 * intentionally (see `useMarkParticipantSalidaMutation`'s own comment for
 * what it does with the recognition), not just displayed as an opaque
 * generic failure. `error.message` is already the safe, backend-approved
 * copy (`SgebApplicationError`'s own contract) — never rendered from
 * `technical_message`.
 */
export function isExitChecklistNotReadyError(error: unknown): boolean {
  return isSgebApplicationError(error) && error.code === 'SGEB-4027'
}

export async function markParticipantSalida(idParticipacion: number): Promise<void> {
  const envelope = await requestSgeb<ParticipacionApiRecord>({
    url: `/participaciones/${String(idParticipacion)}/estado`,
    method: 'PATCH',
    data: { estado: 'salida' },
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful transition
    // always returns the updated row — guarded defensively rather than
    // assumed, same as `fetchEventoDetalle`/`selectParticipant`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
}
