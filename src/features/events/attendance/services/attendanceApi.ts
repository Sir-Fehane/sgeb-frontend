import type { UsuarioBreveApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
import type {
  ParticipacionPuesto,
  TeamSelectionParticipantEstado,
} from '@/features/events/team-selection/types/teamSelection'
import { requestSgeb } from '@/shared/api/sgebClient'
import type {
  AttendanceParticipationEstado,
  EventAttendanceParticipantViewModel,
} from '@/features/events/attendance/types/attendance'

/**
 * Wire shape of `GET /eventos/{id_evento}/participaciones` (`Participacion`
 * schema) — the exact same endpoint and envelope Team Selection already
 * consumes live, but a different projection: this screen also needs
 * `fecha_llegada`, which Team Selection's own `ParticipacionApiRecord`
 * (`team-selection/services/teamSelectionApi.ts`) does not request. Reuses
 * `UsuarioBreveApiRecord`/`TeamSelectionParticipantEstado` — the shared
 * identity/lifecycle wire shapes — rather than redeclaring them; only the
 * participation-record projection itself is feature-local, per
 * docs/FrontendArchitecture.md §17: "prefer one shared transport DTO
 * boundary plus feature-specific mapping where needed... do not force
 * sharing if semantics genuinely differ."
 */
export interface ParticipacionApiRecord {
  id_participacion: number
  puesto: ParticipacionPuesto
  estado: TeamSelectionParticipantEstado
  fecha_llegada: string | null
  usuario: UsuarioBreveApiRecord
}

/** Same join `team-selection/services/teamSelectionApi.ts`'s `nombreCompleto` documents. */
function nombreCompleto(usuario: UsuarioBreveApiRecord): string {
  const apellidos = usuario.apellido_materno
    ? `${usuario.apellido_paterno} ${usuario.apellido_materno}`
    : usuario.apellido_paterno
  return `${usuario.nombre} ${apellidos}`
}

/**
 * Buckets the real 7-value `Participacion.estado` lifecycle into the
 * 3-value subset this screen renders (`AttendanceParticipationEstado`).
 * `null` means "not part of this roster" — `aparto` (not yet selected)
 * belongs to Team Selection, not pase de lista, and is filtered out by the
 * caller before mapping. `asignado`/`vinculo`/`salida` are downstream of
 * `confirmo_llegada` in the pinned backend's forward-only state machine
 * (`participacion_service.ts`'s `TRANSICIONES` map: each state has at most
 * one successor, `salida` terminal) — reaching any of them is only
 * possible once arrival was already confirmed, so they render identically
 * to `confirmo_llegada` here. This is a display simplification of real,
 * honestly-reported state, never an invented one.
 */
function bucketEstado(
  estado: TeamSelectionParticipantEstado,
): AttendanceParticipationEstado | null {
  switch (estado) {
    case 'aparto':
      return null
    case 'seleccionado':
      return 'seleccionado'
    case 'confirmo_asistencia':
      return 'confirmo_asistencia'
    case 'confirmo_llegada':
    case 'asignado':
    case 'vinculo':
    case 'salida':
      return 'confirmo_llegada'
  }
}

/**
 * `ultimaConfirmacionLlegada` is deliberately never populated here: no
 * documented endpoint returns arrival-attempt detail (método, distancia,
 * motivo_fallo, dispositivo vinculado...) to the captain's roster read —
 * only the mesero's own `POST .../confirmacion-llegada` response carries
 * it, momentarily, to the device that made the request (see
 * `types/attendance.ts`'s module comment for the full boundary). This is a
 * genuine, reported backend/OpenAPI gap, not something this mapper
 * fabricates a substitute for.
 *
 * `fechaLlegada` is the one honest live signal available for a
 * successfully-arrived participant — `Participacion.fecha_llegada`,
 * present directly on the roster row.
 */
export function mapParticipacionToAttendanceViewModel(
  record: ParticipacionApiRecord,
): EventAttendanceParticipantViewModel | null {
  const estadoParticipacion = bucketEstado(record.estado)
  if (estadoParticipacion === null) {
    return null
  }

  return {
    idParticipacion: record.id_participacion,
    nombre: nombreCompleto(record.usuario),
    puesto: record.puesto,
    estadoParticipacion,
    ...(estadoParticipacion === 'confirmo_llegada' && record.fecha_llegada
      ? { fechaLlegada: record.fecha_llegada }
      : {}),
  }
}

/**
 * Fetches the event roster through the shared authenticated SGEB
 * transport and narrows it to this screen's scope: participants who have
 * at least been selected (`estado !== 'aparto'`) — a not-yet-selected
 * candidate belongs to Team Selection, not to pase de lista. No `estado`
 * query filter is sent, matching `fetchParticipaciones`'s own reasoning —
 * the full roster is needed to bucket every later state correctly.
 */
export async function fetchAttendanceParticipants(
  idEvento: number,
  signal?: AbortSignal,
): Promise<EventAttendanceParticipantViewModel[]> {
  const envelope = await requestSgeb<ParticipacionApiRecord[]>({
    url: `/eventos/${String(idEvento)}/participaciones`,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? [])
    .map(mapParticipacionToAttendanceViewModel)
    .filter(
      (participant): participant is EventAttendanceParticipantViewModel =>
        participant !== null,
    )
}
