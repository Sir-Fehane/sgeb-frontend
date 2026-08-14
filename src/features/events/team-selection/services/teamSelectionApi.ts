import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type {
  ParticipacionPuesto,
  TeamSelectionParticipantEstado,
  TeamSelectionParticipantViewModel,
} from '@/features/events/team-selection/types/teamSelection'

/**
 * Wire shape of `Participacion.usuario` (`docs/api/openapi-sgeb.yaml`
 * `UsuarioBreve`, confirmed against the pinned backend's
 * `participacion_service.ts` preload of exactly these five columns).
 * `id_usuario` never appears — `ParticipacionEvento.idUsuario` and
 * `Usuario.id` are both `serializeAs: null` in the pinned backend; the only
 * identifier for a waiter that ever leaves the API is `uuid_usuario`.
 */
export interface UsuarioBreveApiRecord {
  uuid_usuario: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  correo: string
  telefono: string | null
}

/**
 * Wire shape of `GET /eventos/{id_evento}/participaciones` and
 * `PATCH /participaciones/{id_participacion}/estado` (`Participacion`
 * schema). `id_evento` is present on the wire but unused here — this
 * feature already has `idEvento` from the route, and fetching it a second
 * time from each row would be redundant.
 */
export interface ParticipacionApiRecord {
  id_participacion: number
  puesto: ParticipacionPuesto
  estado: TeamSelectionParticipantEstado
  checklist_ok: boolean
  usuario: UsuarioBreveApiRecord
}

/**
 * `Usuario.nombre` + `apellido_paterno` + `apellido_materno` — the same
 * display-name join `features/waiters/types/waiter.ts` documents for
 * `nombreCompleto` (`apellido_materno` is nullable and only appended when
 * present).
 */
function nombreCompleto(usuario: UsuarioBreveApiRecord): string {
  const apellidos = usuario.apellido_materno
    ? `${usuario.apellido_paterno} ${usuario.apellido_materno}`
    : usuario.apellido_paterno
  return `${usuario.nombre} ${apellidos}`
}

export function mapParticipacionToViewModel(
  record: ParticipacionApiRecord,
): TeamSelectionParticipantViewModel {
  return {
    idParticipacion: record.id_participacion,
    nombre: nombreCompleto(record.usuario),
    puesto: record.puesto,
    estado: record.estado,
  }
}

/**
 * Fetches the current roster (all lifecycle states, not just `aparto`/
 * `seleccionado`) through the shared authenticated SGEB transport. No
 * `estado` query filter is sent — `TeamSelectionContent` already buckets
 * the full roster into candidates (`estado === 'aparto'`) vs. selected
 * (everything past it) from one response, so a server-side filter would
 * only cost a second round trip for no benefit.
 */
export async function fetchParticipaciones(
  idEvento: number,
  signal?: AbortSignal,
): Promise<TeamSelectionParticipantViewModel[]> {
  const envelope = await requestSgeb<ParticipacionApiRecord[]>({
    url: `/eventos/${String(idEvento)}/participaciones`,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapParticipacionToViewModel)
}

/**
 * `PATCH /participaciones/{id_participacion}/estado` restricted to the one
 * transition this screen performs. The pinned backend's own request-body
 * enum accepts five target values; `SelectParticipantRequest` only ever
 * supplies `'seleccionado'`, so the body is built here rather than passed
 * through from the caller — never forwards a view-model object.
 */
export async function selectParticipant(
  idParticipacion: number,
): Promise<TeamSelectionParticipantViewModel> {
  const envelope = await requestSgeb<ParticipacionApiRecord>({
    url: `/participaciones/${String(idParticipacion)}/estado`,
    method: 'PATCH',
    data: { estado: 'seleccionado' },
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful transition
    // always returns the updated row — guarded defensively rather than
    // assumed, same as `fetchEventoDetalle`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapParticipacionToViewModel(envelope.data)
}
