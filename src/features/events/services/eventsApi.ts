import { requestSgeb } from '@/shared/api/sgebClient'
import type {
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
