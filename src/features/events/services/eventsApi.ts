import { isSgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type {
  EventDetailViewModel,
  EventListItemViewModel,
  EventStatus,
  EventType,
} from '@/features/events/types/event'

/**
 * Wire shape of `GET /eventos` (docs/api/openapi-sgeb.yaml v1.11,
 * `components.schemas.Evento`). Snake_case, exactly as the backend
 * serializes it — confirmed against the pinned backend snapshot's
 * `app/modules/eventos/models/evento.ts` (every `@column` there sets a
 * matching `serializeAs`).
 *
 * `uuid_capitan` is intentionally absent from this type: the documented
 * schema lists it, but the pinned backend never actually serializes it —
 * `Evento.idCapitan` is declared `serializeAs: null`, and neither
 * `EventoService.listar` nor `.obtener` attaches a `uuid_capitan` field
 * anywhere. This is a documented CONTRACT/IMPLEMENTATION MISMATCH (see the
 * branch report), not a typo here — reading a field the backend never
 * sends would only ever produce `undefined`, so it is left out rather than
 * declared and silently unused.
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

/**
 * Maps one `Evento` wire record to the feature's presentation model.
 * `salonNombre`/`capitanNombre` are left `undefined` — neither is part of
 * the documented `Evento` response schema, and `EventListItem` already
 * renders a "pendiente de integración" fallback for both, so no extra
 * handling is needed here.
 */
export function mapEventoToListItem(record: EventoApiRecord): EventListItemViewModel {
  return {
    idEvento: record.id_evento,
    idSalon: record.id_salon,
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
 * `EventDetailViewModel` has no `idSalon`/`fin`/`creadoEn` fields (the
 * existing foundation never displays them), and `salonNombre` is
 * INTENTIONALLY never populated from the live response even though the
 * backend sends it — `EventoService.obtener` does `.preload('salon')`,
 * and Lucid serializes that as an undocumented `salon: {...}` object (the
 * `@belongsTo` relation has no `serializeAs: null`). This is the same
 * undocumented-implementation-detail question already decided against
 * in `mapEventoToListItem` (see that comment) — not part of the
 * documented `Evento` schema, so not depended on here either. Stays
 * `undefined`; `EventDetailScheduleSection` already renders the
 * "pendiente de integración" fallback for it.
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
