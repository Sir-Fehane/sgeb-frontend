/**
 * UI domain types for W-06 "Pase de lista" — the CAPTAIN'S WEB VIEW of
 * attendance, derived from docs/api/openapi-sgeb.yaml v1.6.0's
 * `Participaciones` endpoints. This is observational only: the web panel
 * never performs the mesero's biometric/geolocation arrival confirmation
 * (`POST /participaciones/{id}/confirmacion-llegada` requires
 * mobile/device-originated values — `metodo`, `biometrico_verificado`,
 * `uuid_dispositivo`, `latitud`, `longitud` — that only the iOS client
 * can produce; see `docs/FrontendArchitecture.md` §2.1/§10.3 and this
 * feature's README section for the full ownership boundary).
 *
 * Documentation gap (flagged, not resolved): no dedicated `Participacion`
 * response schema exists anywhere in the OpenAPI document — same status
 * as `TeamSelectionParticipantViewModel`/`EventDetailViewModel` (see
 * their own comments). The *relation* between a participation row and
 * its full arrival-attempt history is not explicitly documented either —
 * `GET /participaciones/{id_participacion}` only says it returns "hitos,
 * checklists y mesas asignadas", without an explicit schema naming
 * `ultima_confirmacion_llegada` or equivalent. This type's nested
 * `ultimaConfirmacionLlegada` is this feature's own presentation
 * synthesis of the documented `ConfirmacionLlegada` schema, not a claimed
 * literal API response shape — the exact source/relation for this data
 * during live integration is a genuine open question for a later branch,
 * not invented here.
 *
 * Critical modeling rule: participation state and arrival-attempt result
 * are DIFFERENT concerns, kept as separate fields on purpose. A
 * participant may be `estadoParticipacion: 'confirmo_asistencia'` with
 * `ultimaConfirmacionLlegada.resultado: 'fallido'` at the same time — a
 * failed arrival attempt never advances participation state on its own.
 * `estadoParticipacion: 'confirmo_llegada'` is the only state that means
 * arrival genuinely, successfully advanced. No fake participation state
 * (`llegada_fallida`, `biometria_fallida`, `gps_fallido`,
 * `pendiente_revision`, ...) is ever added to `estadoParticipacion`'s
 * enum — those are presentation-only outcomes of
 * `ultimaConfirmacionLlegada`, never confused with the real SGEB enum.
 */

/**
 * The subset of the documented 7-value lifecycle this screen renders —
 * only the three states relevant to attendance/arrival. `aparto` never
 * reaches this screen (not yet selected); `asignado`, `vinculo`, `salida`
 * belong to montaje/table-assignment and event-closing, out of scope
 * here.
 */
export type AttendanceParticipationEstado =
  'seleccionado' | 'confirmo_asistencia' | 'confirmo_llegada'

/** Mirrors `TeamSelectionParticipantViewModel.puesto` — the same documented enum. */
export type AttendancePuesto = 'mesero' | 'barra'

/** `ConfirmacionLlegada.metodo` — `ninguno` covers no biometric sensor configured/available. */
export type ArrivalMetodo = 'huella' | 'face_id' | 'ninguno'

/** `ConfirmacionLlegada.resultado`. */
export type ArrivalResultado = 'exitoso' | 'fallido'

/**
 * `ConfirmacionLlegada.motivo_fallo` — `null`/absent only when
 * `resultado === 'exitoso'`. Deliberately NOT flattened into one
 * "fallido" bucket at the type level: each value carries a materially
 * different severity (see `utils/attendancePresentation.ts`) —
 * `dispositivo_de_otro_usuario` is a documented collusion signal
 * (SGEB-4025, "se alerta al capitán"); `precision_insuficiente`
 * (SGEB-4026) is explicitly documented as inconclusive, "no se registra
 * como asistencia denegada" — never the same presentation as a genuine
 * denial.
 */
export type ArrivalMotivoFallo =
  | 'fuera_geocerca'
  | 'biometria_fallida'
  | 'dispositivo_no_vinculado'
  | 'dispositivo_de_otro_usuario'
  | 'precision_insuficiente'

/**
 * One arrival attempt (`ConfirmacionLlegada`). `uuid_dispositivo` and
 * `id_confirmacion` are deliberately NOT modeled here — both are
 * documented fields, but neither has a captain-facing presentation
 * purpose (see this feature's README). `modeloVerificacion` is likewise
 * omitted: it is always the fixed value `atestacion_local` today (local
 * attestation, never cryptographic proof), which this feature treats as
 * an implementation detail rather than something to surface per-row.
 */
export interface ArrivalConfirmationViewModel {
  metodo: ArrivalMetodo
  biometricoVerificado: boolean
  dispositivoVinculado: boolean
  distanciaM: number
  precisionM?: number | null
  dentroGeocerca: boolean
  resultado: ArrivalResultado
  motivoFallo?: ArrivalMotivoFallo | null
  /** Server-assigned UTC timestamp — see `utils/attendanceFormatting.ts`. */
  timestamp: string
}

export interface EventAttendanceParticipantViewModel {
  idParticipacion: number
  nombre: string
  puesto: AttendancePuesto
  estadoParticipacion: AttendanceParticipationEstado
  /** Absent when no arrival attempt has been recorded yet ("Llegada pendiente"). */
  ultimaConfirmacionLlegada?: ArrivalConfirmationViewModel
}
