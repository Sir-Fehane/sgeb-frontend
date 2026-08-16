import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { ParticipacionApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'

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
