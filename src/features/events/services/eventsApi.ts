import { isSgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type {
  EventCaptainViewModel,
  EventDetailViewModel,
  EventListItemViewModel,
  EventStatus,
  EventType,
} from '@/features/events/types/event'

/**
 * Wire shape of `capitan`, embedded on every `Evento` response
 * (docs/api/openapi-sgeb.yaml v1.12.0, `Evento.capitan` → `UsuarioBreve`).
 * Confirmed against the pinned backend's `EventoService.listar`/`.obtener`
 * `.preload('capitan', (u) => u.select('uuid_usuario', 'nombre',
 * 'apellido_paterno', 'apellido_materno', 'correo'))` — no `telefono`,
 * unlike the full `UsuarioBreve` documented on `Participacion.usuario`.
 */
export interface CapitanApiRecord {
  uuid_usuario: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  correo: string
}

/**
 * Wire shape of `GET /eventos` (docs/api/openapi-sgeb.yaml v1.12.0,
 * `components.schemas.Evento`). Snake_case, exactly as the backend
 * serializes it — confirmed against the pinned backend snapshot's
 * `app/modules/eventos/models/evento.ts` (every `@column` there sets a
 * matching `serializeAs`).
 *
 * A flat `uuid_capitan` field is still absent from this type — `Evento.
 * idCapitan` stays `serializeAs: null` — but as of v1.12 the backend
 * embeds the resolved captain as the nested `capitan` object below
 * instead (confirmed by `EventoService.listar`/`.obtener`'s `.preload`
 * and by `tests/unit/dominio_reglas.spec.ts` asserting `json.capitan.
 * uuid_usuario` while asserting `notProperty(json, 'id_capitan')`).
 */
export interface EventoApiRecord {
  id_evento: number
  id_salon: number
  titulo: string
  tipo: EventType
  fecha: string
  hora_presentacion: string
  inicio: string
  fin: string | null
  cupo_meseros: number
  num_mesas: number
  tarifa_por_mesero: number
  radio_geocerca_m: number
  estado: EventStatus
  creado_en: string
  capitan: CapitanApiRecord
  /**
   * Real, always-present wire field on the pinned backend — but an
   * internal object-storage key, never a public URL (`Evento.comanda_url`'s
   * own OpenAPI description: "NO es una URL pública"; `docs/decisions.md`
   * ADR-007). Declared here because the backend genuinely sends it (unlike
   * `uuid_capitan`, see this interface's own doc), but deliberately read
   * by nothing in this file — see `mapEventoToDetail`'s comment. Comanda
   * is its own server resource with its own dedicated endpoints; see
   * `services/comandaApi.ts`. Optional here (not required) purely so the
   * many pre-existing `EventoApiRecord` test fixtures across other
   * features/pages that predate this field don't all need updating for a
   * value none of them exercise; every real response includes it.
   */
  comanda_url?: string | null
}

/**
 * `GET /eventos` query parameters this call actually sends.
 *
 * Deliberately narrower than the four dimensions `openapi-sgeb.yaml`
 * documents (`fecha_desde`, `fecha_hasta`, `estado`, `id_salon`): the
 * pinned backend's `filtrosEventoValidator`
 * (`app/modules/eventos/validators/evento_validator.ts`) reads
 * `fechaDesde`/`fechaHasta` (camelCase, not the documented snake_case) and
 * has no `id_salon` field at all. VineJS silently strips unknown
 * properties rather than rejecting them, so sending the documented
 * snake_case names would not error — it would just silently fail to
 * filter. This type matches the verified, working backend shape instead;
 * see the branch report for the full mismatch writeup.
 */
export interface EventsListParams {
  estado?: EventStatus
  fechaDesde?: string
  fechaHasta?: string
}

function mapCapitan(record: CapitanApiRecord): EventCaptainViewModel {
  return {
    uuidUsuario: record.uuid_usuario,
    nombre: record.nombre,
    apellidoPaterno: record.apellido_paterno,
    apellidoMaterno: record.apellido_materno,
    correo: record.correo,
  }
}

/**
 * Maps one `Evento` wire record to the feature's presentation model.
 * `salonNombre` is left `undefined` — not part of the documented `Evento`
 * response schema, and `EventListItem` already renders a "pendiente de
 * integración" fallback for it. `capitan` IS part of the documented
 * response schema (v1.12) and is mapped directly below.
 */
export function mapEventoToListItem(record: EventoApiRecord): EventListItemViewModel {
  return {
    idEvento: record.id_evento,
    idSalon: record.id_salon,
    capitan: mapCapitan(record.capitan),
    titulo: record.titulo,
    tipo: record.tipo,
    fecha: record.fecha,
    horaPresentacion: record.hora_presentacion,
    inicio: record.inicio,
    fin: record.fin,
    cupoMeseros: record.cupo_meseros,
    numMesas: record.num_mesas,
    tarifaPorMesero: record.tarifa_por_mesero,
    radioGeocercaM: record.radio_geocerca_m,
    estado: record.estado,
    creadoEn: record.creado_en,
  }
}

/**
 * Fetches the events list through the shared authenticated SGEB transport.
 * Resolves to the mapped list regardless of `SGEB-0000` vs `SGEB-0002`
 * (empty result) — both carry the array in `data`, and the caller only
 * needs to branch on `length === 0`, not on `result.code`.
 */
export async function fetchEventos(
  params: EventsListParams,
  signal?: AbortSignal,
): Promise<EventListItemViewModel[]> {
  const envelope = await requestSgeb<EventoApiRecord[]>({
    url: '/eventos',
    // `SgebRequestConfig.params` is `Record<string, unknown>` (an index
    // signature); `EventsListParams` has none, which TS treats as
    // structurally incompatible even though every value here is a plain
    // string. Safe: every field is a `string | undefined`.
    params: params as Record<string, unknown>,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapEventoToListItem)
}

/**
 * `SGEB-3001` — the pinned backend's generic "not found" business code
 * (`app/shared/errors/sgeb_error.ts`'s `errores.noEncontrado`, HTTP 404),
 * thrown by `EventoService.obtener` when `GET /eventos/{id_evento}` finds
 * no matching row. Not registered in `shared/api/sgebCodes.ts` — that file
 * is deliberately limited to transport-level codes (token/auth), and
 * `SGEB-3001` is a plain, feature-owned business outcome (per
 * docs/decisions.md ADR-005: business codes belong to the feature that
 * owns them).
 */
const EVENT_NOT_FOUND_CODE = 'SGEB-3001'

/**
 * True for the specific, deterministic "no such event" outcome — as
 * opposed to any other `SgebApplicationError`/`SgebNetworkError`. Callers
 * use this to render the existing "not found" UI (`EventDetailUnavailableState`)
 * instead of the generic error state, exactly as a malformed route id
 * already does.
 */
export function isEventoNotFoundError(error: unknown): boolean {
  return isSgebApplicationError(error) && error.code === EVENT_NOT_FOUND_CODE
}

/**
 * Maps one `Evento` wire record to the Event Detail presentation model.
 *
 * Deliberately narrower than `mapEventoToListItem`:
 * `EventDetailViewModel` has no `fin`/`creadoEn` fields (the existing
 * foundation never displays them). `idSalon` IS mapped, unlike those two —
 * it is the same confirmed `EventoCrear.id_salon` FK `mapEventoToListItem`
 * already carries, and `EventDetailPage` needs it to resolve the real
 * salón through the separate `GET /salones/{id_salon}` endpoint
 * (`services/salonesApi.ts`'s `fetchSalonById`).
 *
 * `salonNombre` is a different story and stays INTENTIONALLY unpopulated
 * here even though `idSalon` now is: `EventoService.obtener` does
 * `.preload('salon')`, and Lucid serializes that as an undocumented
 * `salon: {...}` object (the `@belongsTo` relation has no
 * `serializeAs: null`) — the same undocumented-implementation-detail
 * question already decided against in `mapEventoToListItem` (see that
 * comment), not part of the documented `Evento` schema, so not depended on
 * here either. This mapper stays a pure, stateless translation of the wire
 * record; resolving the real salón name is `EventDetailPage`'s job (a
 * second, separate `GET /salones/{id_salon}` request keyed off `idSalon`
 * above), not this function's — `EventDetailScheduleSection` renders
 * whatever name (if any) that resolution produces, falling back to the
 * existing "pendiente de integración" text exactly as before when it
 * can't (no permission, no network, still loading).
 *
 * `capitan` IS mapped, via the shared `mapCapitan` helper — confirmed
 * embedded on this endpoint's response as of v1.12 (see `EventoApiRecord`'s
 * own comment).
 *
 * `record.comanda_url` is likewise real and always present in the wire
 * response, but is deliberately read by NOTHING here — `EventDetailViewModel`
 * has no `comandaUrl` field at all (see that type's own comment). It
 * documents an **internal object-storage key**, never a public URL
 * (`Evento.comanda_url`'s own OpenAPI description: "NO es una URL
 * pública"; `docs/decisions.md` ADR-007). Comanda is its own server
 * resource, fetched independently through `services/comandaApi.ts`
 * (`GET /eventos/{id}/comanda`, which returns a fresh, short-lived signed
 * URL — never this field) — folding `comanda_url` into this mapper would
 * risk it reaching `EventDetailComandaSection` as if it were a safe,
 * navigable value.
 */
export function mapEventoToDetail(record: EventoApiRecord): EventDetailViewModel {
  return {
    idEvento: record.id_evento,
    idSalon: record.id_salon,
    capitan: mapCapitan(record.capitan),
    titulo: record.titulo,
    tipo: record.tipo,
    estado: record.estado,
    fecha: record.fecha,
    horaPresentacion: record.hora_presentacion,
    inicio: record.inicio,
    cupoMeseros: record.cupo_meseros,
    numMesas: record.num_mesas,
    tarifaPorMesero: record.tarifa_por_mesero,
    radioGeocercaM: record.radio_geocerca_m,
  }
}

/**
 * Fetches one event's detail through the shared authenticated SGEB
 * transport. Lets `SgebApplicationError`/`SgebNetworkError` propagate
 * unchanged — including `SGEB-3001` (not found) — so the caller (the
 * query hook / page) decides how to present each outcome; this function
 * only fetches and maps, it never swallows an error into a fixed value.
 */
export async function fetchEventoDetalle(
  idEvento: number,
  signal?: AbortSignal,
): Promise<EventDetailViewModel> {
  const envelope = await requestSgeb<EventoApiRecord>({
    url: `/eventos/${String(idEvento)}`,
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend (a 200 for a single
    // resource always carries the record; "no such event" is SGEB-3001,
    // not a null-data success) — guarded defensively rather than assumed.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapEventoToDetail(envelope.data)
}

/**
 * `POST /eventos` request body — exact field set confirmed against the
 * pinned backend's `crearEventoValidator`
 * (`app/modules/eventos/validators/evento_validator.ts`). Deliberately
 * camelCase: this branch's reconciliation confirmed the real wire request
 * is camelCase (`idSalon`, `uuidCapitan`, `horaPresentacion`, ...), not the
 * snake_case `openapi-sgeb.yaml` documents — see this branch's report for
 * the full CONFIRMED MISMATCH writeup (same kind of documented-vs-real gap
 * already flagged for `costoEstimado` in
 * `features/events/closure/services/closureApi.ts`).
 *
 * `uuidCapitan` is always present here (unlike the earlier field-validation
 * prototype, where it was deliberately absent as "integration-owned") — it
 * is now resolved from the authenticated session's own `sub` claim by the
 * caller (`useCreateEventoMutation`), never a fabricated value or an
 * unapproved captain-picker: the pinned backend has no endpoint to list
 * other captains, and `EventoService.crear` accepts a `capitan`/`admin`
 * self-assignment exactly like this.
 *
 * `comandaUrl` is intentionally omitted — comanda stays a strictly
 * post-creation resource, uploaded from Event Detail
 * (`EventDetailComandaSection`), never part of this request.
 */
export interface CreateEventoRequest {
  idSalon: number
  uuidCapitan: string
  titulo: string
  tipo: EventType
  fecha: string
  horaPresentacion: string
  inicio: string
  cupoMeseros: number
  numMesas: number
  tarifaPorMesero: number
  radioGeocercaM: number
}

/**
 * The only field `createEvento`'s caller (`EventCreatePage`, via
 * `useCreateEventoMutation`) actually needs from a successful `POST
 * /eventos` — just enough to navigate to `/eventos/{idEvento}`, which then
 * fetches the event fresh through `GET /eventos/{id}` (`fetchEventoDetalle`)
 * for real display. See `createEvento`'s own comment for why this response
 * is deliberately never run through `mapEventoToDetail`.
 */
export interface CreatedEventoResult {
  idEvento: number
}

/**
 * Creates a real event through the shared authenticated SGEB transport.
 * The server always sets `estado: 'borrador'`
 * (`EventoService.crear`) — this function never sends and the request type
 * never accepts an `estado` field. No optimistic write: the caller only
 * learns the created event's real id from this response, and the events
 * list only learns of it through cache invalidation
 * (`useCreateEventoMutation`), never a locally fabricated entry.
 *
 * **Deliberately never calls `mapEventoToDetail`/`mapCapitan` on this
 * response, and deliberately resolves to `CreatedEventoResult` rather than
 * `EventDetailViewModel`.** Confirmed directly against the pinned backend
 * (`EventoService.crear`, `app/modules/eventos/services/evento_service.ts`):
 * unlike `.obtener()`/`.listar()` (both `.preload('capitan', ...)`),
 * `crear()` returns `Evento.create({...})` straight from the insert, with
 * `capitan` never preloaded — so this response's `capitan` key is entirely
 * absent on the wire, not merely `null`. Running it through
 * `mapEventoToDetail` (which unconditionally dereferences
 * `record.capitan.uuid_usuario` via `mapCapitan`) throws a plain
 * `TypeError`, which is neither a `SgebApplicationError` nor a
 * `SgebNetworkError` — so it fell through `EventCreatePage`'s
 * `toSafeErrorMessage` to the generic "Ocurrió un error inesperado.",
 * misreporting a genuinely successful `SGEB-0001` creation (HTTP 201, the
 * event really persisted) as a failure. This is the exact same
 * incomplete-preload-on-write class of bug already fixed twice elsewhere —
 * `changeEventoEstado`'s own comment (backend-side fix: `cambiarEstado` now
 * re-fetches through `obtener()`) and `teamSelectionApi.ts`'s
 * `selectParticipant` (frontend-side fix: resolves to `void`, same
 * reasoning applied here). The shared SGEB transport
 * (`shared/api/sgebClient.ts`) is NOT the bug — it already resolves any
 * 2xx response (including HTTP 201/`SGEB-0001`) as a success regardless of
 * `result.code`; this crash happened strictly after that, while turning an
 * already-successful response into a view model. `id_evento` itself is
 * always present (`Evento`'s own primary-key column, never a preloaded
 * relation), so reading it directly off `envelope.data` is safe.
 */
export async function createEvento(
  request: CreateEventoRequest,
): Promise<CreatedEventoResult> {
  const envelope = await requestSgeb<EventoApiRecord>({
    url: '/eventos',
    method: 'POST',
    data: request,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful creation
    // always returns the created Evento — guarded defensively rather than
    // assumed, same as `fetchEventoDetalle`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return { idEvento: envelope.data.id_evento }
}

/**
 * `PUT /eventos/{id_evento}` request body — a genuine *partial* update
 * despite the HTTP verb (every field is optional in the pinned backend's
 * `actualizarEventoValidator`). Deliberately narrower than `CreateEventoRequest`:
 * `idSalon`/`fecha`/`horaPresentacion`/`inicio`/`estado` are not accepted by
 * this endpoint at all (confirmed against the validator — sending them
 * would just be silently stripped by VineJS, so this type never offers
 * them to a caller). `uuidCapitan` is technically editable server-side but
 * this feature never re-assigns captaincy from Event Detail — no UI exists
 * for it, so it is omitted here too (see this branch's report for why: no
 * approved captain-reassignment flow, same reasoning `EventCreateForm`
 * already applied to the create side).
 *
 * `radioGeocercaM` carries its own state restriction the caller must
 * respect: the pinned backend rejects the request with `SGEB-4013` if this
 * key is present at all while `estado !== 'borrador'` — even if the value
 * is unchanged. `EventEditForm`/`useUpdateEventoMutation` must omit this
 * key entirely outside `borrador`, never merely disable the input while
 * still submitting the current value.
 */
export interface UpdateEventoRequest {
  titulo?: string
  tipo?: EventType
  cupoMeseros?: number
  numMesas?: number
  tarifaPorMesero?: number
  radioGeocercaM?: number
}

/**
 * Updates a real event through the shared authenticated SGEB transport.
 * The pinned backend rejects this entirely once `estado` is `finalizado`
 * or `cancelado` (`SGEB-4013`) — that restriction is enforced server-side;
 * this function does not duplicate it client-side, it only surfaces
 * whatever safe error the server returns.
 */
export async function updateEvento(
  idEvento: number,
  request: UpdateEventoRequest,
): Promise<EventDetailViewModel> {
  const envelope = await requestSgeb<EventoApiRecord>({
    url: `/eventos/${String(idEvento)}`,
    method: 'PUT',
    data: request,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — guarded defensively
    // rather than assumed, same as `createEvento`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapEventoToDetail(envelope.data)
}

/**
 * `PATCH /eventos/{id_evento}/estado` — the real event-state-machine
 * endpoint (`EventoService.cambiarEstado`), generalized to any of the five
 * documented `estado` values. This is the one shared implementation for
 * that endpoint: `features/events/closure/services/closureApi.ts`'s
 * `finalizeEvento` (the pre-existing `en_curso → finalizado` transition
 * Closure owns) delegates to this function rather than duplicating its own
 * `requestSgeb` call — see that file's own comment for why this extraction
 * was judged safe (identical request shape, no behavior change, Closure's
 * own mutation/invalidation/tests are untouched).
 *
 * The request body carries only `estado` — never a client-computed `fin`;
 * the server seals that itself for the `finalizado` transition. Confirmed
 * transition table (`EventoService`'s own `TRANSICIONES`):
 * `borrador → publicado|cancelado`, `publicado → en_curso|borrador|cancelado`,
 * `en_curso → finalizado|cancelado`, `finalizado`/`cancelado` terminal. Any
 * other transition rejects with `SGEB-4011` — this function does not
 * pre-validate that table client-side; callers (each lifecycle action
 * component) only ever offer the transitions valid for the event's current
 * `estado`, and the server remains the authoritative enforcer regardless.
 *
 * **Deliberately still returns `void`, not the mapped `Evento`.** As of
 * v1.13, `EventoService.cambiarEstado` re-fetches through the same
 * `obtener()` `GET /eventos/{id}` uses — `capitan`/`salon` preloaded, same
 * shape either way — confirmed the previous incomplete-response gap (a
 * `capitan`-less payload that made `mapEventoToDetail` throw on an
 * otherwise-successful transition) is fixed. This function keeps
 * discarding the response and relying on `eventsQueryKeys.detail`/
 * `.lists()` invalidation regardless: no caller has ever read
 * `mutation.data` here, invalidation is already correct and inexpensive,
 * and mapping a second response shape for this one endpoint would just be
 * a second code path to keep in sync for no behavioral gain.
 */
export async function changeEventoEstado(
  idEvento: number,
  estado: EventStatus,
): Promise<void> {
  const envelope = await requestSgeb<EventoApiRecord>({
    url: `/eventos/${String(idEvento)}/estado`,
    method: 'PATCH',
    data: { estado },
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — guarded defensively
    // rather than assumed, same as `createEvento`. Confirms the write
    // actually returned a record at all; it deliberately does NOT map
    // that record any further — see this function's own comment.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
}
