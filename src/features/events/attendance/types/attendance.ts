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
 * Documentation gap (flagged, confirmed during live integration — feature/
 * attendance-live-integration): no dedicated `Participacion` response
 * schema exists anywhere in the OpenAPI document — same status as
 * `TeamSelectionParticipantViewModel`/`EventDetailViewModel` (see their
 * own comments). The *relation* between a participation row and its full
 * arrival-attempt history is not explicitly documented either —
 * `GET /participaciones/{id_participacion}` only says it returns "hitos,
 * checklists y mesas asignadas", without an explicit schema naming
 * `ultima_confirmacion_llegada` or equivalent, and the pinned backend's
 * `ParticipacionEvento` model/serializer confirms there is genuinely no
 * such field or endpoint: `ConfirmacionLlegada` rows are persisted (one
 * per attempt, evidence for a captain's attendance dispute) but never
 * exposed to any captain-facing read. This type's nested
 * `ultimaConfirmacionLlegada` remains this feature's own presentation
 * synthesis of the documented `ConfirmacionLlegada` schema — still
 * fixture/demo-only today, never populated by
 * `services/attendanceApi.ts`'s live mapper, which honestly leaves it
 * `undefined` rather than fabricate a substitute. `fechaLlegada` below is
 * the one live signal a successful arrival actually has:
 * `Participacion.fecha_llegada`, present directly on the roster row.
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
 * reaches this screen (not yet selected — filtered out by
 * `services/attendanceApi.ts` before mapping). `asignado`, `vinculo`,
 * `salida` are real states a live participant can be in (montaje/
 * table-assignment and event-closing have moved them forward), but the
 * pinned backend's state machine is forward-only from `confirmo_llegada`
 * (see `participacion_service.ts`'s `TRANSICIONES` map) — reaching any of
 * them requires arrival to have already been confirmed, so
 * `services/attendanceApi.ts` buckets all three into `confirmo_llegada`
 * for this screen's purposes rather than adding fake extra states here.
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
  /**
   * `Participacion.fecha_llegada` — only ever present alongside
   * `estadoParticipacion: 'confirmo_llegada'`. This is the live
   * integration's honest replacement for reading a timestamp off
   * `ultimaConfirmacionLlegada` (which live data never populates, see
   * above): the roster row itself carries the real arrival moment even
   * though it carries none of the verification detail.
   */
  fechaLlegada?: string
}
