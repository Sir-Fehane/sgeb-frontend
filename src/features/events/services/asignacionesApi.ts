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
 * (docs/api/openapi-sgeb.yaml v1.13.0, `AsignacionMesaDetalle`) — confirmed
 * against the pinned backend's `ParticipacionService.listarAsignaciones`
 * (`app/modules/participaciones/services/participacion_service.ts`) and its
 * `AsignacionMesa` model.
 *
 * `activa`/`fecha_liberacion` are v1.13's explicit validity fields,
 * orthogonal to `vinculada`: `activa=true,vinculada=false` → assigned, the
 * mesero hasn't scanned the table's QR yet; `activa=true,vinculada=true` →
 * linked; `activa=false` → released (`fecha_liberacion` says when). Rows
 * are never deleted — release is a soft-release — so `activa` is the one
 * field that says whether a row is current. See `deriveMontageAssignments`,
 * which now derives "current table" purely from this field.
 */
export interface AsignacionMesaApiRecord {
  id_asignacion: number
  id_participacion: number
  id_mesa: number
  vinculada: boolean
  fecha_asignacion: string
  fecha_vinculacion: string | null
  activa: boolean
  fecha_liberacion: string | null
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
  /** `false` means released/historical — see `AsignacionMesaApiRecord`'s own comment. The default (unfiltered) `fetchAsignaciones` call only ever returns `activa: true` rows; this field only becomes relevant once a caller passes `{ activa: false }` to read history. */
  activa: boolean
  fechaLiberacion: string | null
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
    activa: record.activa,
    fechaLiberacion: record.fecha_liberacion,
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
  /**
   * `true` (the server default when omitted) for current assignments only;
   * `false` queries the released/historical set instead. Every existing
   * caller in this codebase omits this — matching the server's own
   * default — so passing it explicitly is only for a future
   * assignment-history screen, not built in this branch.
   */
  activa?: boolean
}

/**
 * Fetches an event's real table assignments ("panel de piso") through the
 * shared authenticated SGEB transport. `GET /eventos/{id_evento}/asignaciones`
 * sits in the pinned backend's "any authenticated role" route group — no
 * `middleware.rol([...])` guard (`start/routes.ts`) — same as `fetchMesas`.
 *
 * Confirmed on the pinned v1.13 backend: an unknown `idEvento` now responds
 * `404` (`SGEB-3001`), a deliberate fix — an empty result and a nonexistent
 * event used to both resolve `200 []`, and the panel couldn't tell "nothing
 * assigned yet" from "this screen doesn't exist." This function lets that
 * rejection propagate like any other `SgebApplicationError`, same as
 * `fetchEventoDetalle`.
 */
export async function fetchAsignaciones(
  idEvento: number,
  params?: FetchAsignacionesParams,
  signal?: AbortSignal,
): Promise<AsignacionMesaViewModel[]> {
  const queryParams: Record<string, boolean> = {}
  if (params?.vinculada !== undefined) {
    queryParams.vinculada = params.vinculada
  }
  if (params?.activa !== undefined) {
    queryParams.activa = params.activa
  }

  const envelope = await requestSgeb<AsignacionMesaApiRecord[]>({
    url: `/eventos/${String(idEvento)}/asignaciones`,
    ...(Object.keys(queryParams).length > 0 ? { params: queryParams } : {}),
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapAsignacionToViewModel)
}

/**
 * `POST /participaciones/{id_participacion}/asignaciones` (capitan/admin,
 * RF-21) — request body confirmed against the pinned backend's
 * `asignarMesaValidator` (`vine.object({ idMesa: ... })`, camelCase).
 * Confirmed server guards, in order (`ParticipacionService.asignarMesa`):
 * event not `finalizado`/`cancelado` (`SGEB-4013`); participation `estado`
 * ∈ `confirmo_llegada | asignado | vinculo` (`SGEB-4011`); `checklist_ok`
 * (`SGEB-4005`); mesa belongs to the same event (`SGEB-3002`); no other
 * currently-`activa` assignment on that mesa (`SGEB-4006`). This screen's
 * own eligibility copy (`EventMontageAssignmentSection`) is a UI-level
 * safeguard on top of these — not a substitute, the server remains
 * authoritative. The response is a bare `AsignacionMesa` (no joined
 * `mesa`/`participacion`, unlike the readback endpoint) — never read here,
 * since every caller reconciles through `fetchAsignaciones` after
 * invalidating instead of trusting this response as local truth.
 */
export async function assignTable(
  idParticipacion: number,
  idMesa: number,
): Promise<void> {
  await requestSgeb<unknown>({
    url: `/participaciones/${String(idParticipacion)}/asignaciones`,
    method: 'POST',
    data: { idMesa },
  })
}

/**
 * `DELETE /asignaciones/{id_asignacion}` (capitan/admin) — a logical
 * release, confirmed by direct read of `ParticipacionService.liberarMesa`:
 * the `AsignacionMesa` row is never deleted, only soft-released (`activa`
 * and `vinculada` both flip to `false`, `fecha_liberacion` set) and
 * `Mesa.estado` returns to `libre`. As of v1.13 it also reverts the
 * participation's `estado` back to `confirmo_llegada` when this was its
 * last remaining active assignment — the fix for the previously-reported
 * smoke bug where a released mesero could still show "con mesa asignada."
 * Blocks only on active orders for that mesa (`SGEB-4018`). `data` is
 * always `null` on success per the documented contract — not a defensive
 * guard like `assignTable`'s, an expected response shape.
 */
export async function releaseAssignment(idAsignacion: number): Promise<void> {
  await requestSgeb<null>({
    url: `/asignaciones/${String(idAsignacion)}`,
    method: 'DELETE',
  })
}
