import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of the `mesa` resolved on each assignment — a full `Mesa` row,
 * confirmed against the pinned backend's `listarAsignaciones` (preloads the
 * whole `mesa` relation, unrestricted). Field-for-field the same as
 * `mesasApi.ts`'s `MesaApiRecord`, kept as its own local type rather than
 * imported to avoid this foundation depending on Mesa's own module shape
 * evolving independently.
 */
export interface AsignacionMesaMesaApiRecord {
  id_mesa: number
  id_evento: number
  etiqueta: string
  codigo_qr: string
  nfc_uid: string | null
  estado: 'libre' | 'ocupada'
}

/**
 * Wire shape of the `usuario` nested inside `participacion` on this
 * endpoint specifically — confirmed NARROWER than `UsuarioBreve`/
 * `Evento.capitan`: the pinned backend's `listarAsignaciones` preloads
 * `participacion.usuario` selecting only `uuid_usuario, nombre,
 * apellido_paterno, apellido_materno` (`participacion_service.ts`'s
 * `listarAsignaciones`) — no `correo`, no `telefono`, unlike
 * `GET /participaciones/{id}` or `Evento.capitan`. This is a real,
 * confirmed OpenAPI-vs-implementation discrepancy (the spec references the
 * full `UsuarioBreve` here) — see the branch report.
 */
export interface AsignacionMesaUsuarioApiRecord {
  uuid_usuario: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
}

/** `Participacion.estado` — the confirmed linear state machine (`participacion_service.ts`'s `TRANSICIONES`). */
export type ParticipacionEstado =
  | 'aparto'
  | 'seleccionado'
  | 'confirmo_asistencia'
  | 'confirmo_llegada'
  | 'asignado'
  | 'vinculo'
  | 'salida'

export interface AsignacionMesaParticipacionApiRecord {
  id_participacion: number
  id_evento: number
  puesto: 'mesero' | 'barra'
  estado: ParticipacionEstado
  checklist_ok: boolean
  usuario: AsignacionMesaUsuarioApiRecord
}

/**
 * Wire shape of `GET /eventos/{id_evento}/asignaciones`
 * (docs/api/openapi-sgeb.yaml v1.12.0, `AsignacionMesaDetalle`) — confirmed
 * against the pinned backend's `ParticipacionService.listarAsignaciones`
 * (`app/modules/participaciones/services/participacion_service.ts`).
 */
export interface AsignacionMesaApiRecord {
  id_asignacion: number
  id_participacion: number
  id_mesa: number
  vinculada: boolean
  fecha_asignacion: string
  fecha_vinculacion: string | null
  mesa: AsignacionMesaMesaApiRecord
  participacion: AsignacionMesaParticipacionApiRecord
}

export interface AsignacionMesaViewModel {
  idAsignacion: number
  idParticipacion: number
  idMesa: number
  /** `true` once the mesero has scanned the mesa's real QR — see `mesa.codigoQr` below; NFC plays no part. */
  vinculada: boolean
  fechaAsignacion: string
  fechaVinculacion: string | null
  mesa: {
    idMesa: number
    etiqueta: string
    estado: 'libre' | 'ocupada'
  }
  participacion: {
    idParticipacion: number
    puesto: 'mesero' | 'barra'
    estado: ParticipacionEstado
    checklistOk: boolean
    usuario: {
      uuidUsuario: string
      nombre: string
      apellidoPaterno: string
      apellidoMaterno: string | null
    }
  }
}

function mapAsignacionToViewModel(
  record: AsignacionMesaApiRecord,
): AsignacionMesaViewModel {
  return {
    idAsignacion: record.id_asignacion,
    idParticipacion: record.id_participacion,
    idMesa: record.id_mesa,
    vinculada: record.vinculada,
    fechaAsignacion: record.fecha_asignacion,
    fechaVinculacion: record.fecha_vinculacion,
    mesa: {
      idMesa: record.mesa.id_mesa,
      etiqueta: record.mesa.etiqueta,
      estado: record.mesa.estado,
    },
    participacion: {
      idParticipacion: record.participacion.id_participacion,
      puesto: record.participacion.puesto,
      estado: record.participacion.estado,
      checklistOk: record.participacion.checklist_ok,
      usuario: {
        uuidUsuario: record.participacion.usuario.uuid_usuario,
        nombre: record.participacion.usuario.nombre,
        apellidoPaterno: record.participacion.usuario.apellido_paterno,
        apellidoMaterno: record.participacion.usuario.apellido_materno,
      },
    },
  }
}

export interface FetchAsignacionesParams {
  /** `true` for assignments where the mesero has already scanned the mesa's QR in person; omit for all. */
  vinculada?: boolean
}

/**
 * Fetches an event's real table assignments ("panel de piso") through the
 * shared authenticated SGEB transport. `GET /eventos/{id_evento}/asignaciones`
 * sits in the pinned backend's "any authenticated role" route group — no
 * `middleware.rol([...])` guard (`start/routes.ts`) — same as `fetchMesas`.
 *
 * Confirmed backend quirk, NOT matching `openapi-sgeb.yaml`'s documented
 * `404`: `listarAsignaciones` never checks the event exists before
 * querying, so an unknown `idEvento` resolves to an empty array (HTTP 200),
 * never a rejected promise. Callers must not treat an empty result as
 * "event not found."
 */
export async function fetchAsignaciones(
  idEvento: number,
  params?: FetchAsignacionesParams,
  signal?: AbortSignal,
): Promise<AsignacionMesaViewModel[]> {
  const envelope = await requestSgeb<AsignacionMesaApiRecord[]>({
    url: `/eventos/${String(idEvento)}/asignaciones`,
    ...(params?.vinculada !== undefined
      ? { params: { vinculada: params.vinculada } }
      : {}),
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapAsignacionToViewModel)
}
