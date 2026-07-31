/**
 * UI domain types for the SGEB events module, derived from
 * docs/api/documentacion-endpoints.txt (`EventoCrear`, `/eventos` query
 * params) and docs/data/diccionario-datos.pdf's EVENTO table.
 *
 * Documentation gap (flagged, not resolved): neither source defines a
 * literal read/response schema for "Evento" — only the `EventoCrear`
 * *request* shape is documented. `EventListItemViewModel` below is a
 * necessary synthesis for presentation purposes, not a literal
 * documented schema or a confirmed backend DTO — see its own comment.
 */

/** `EVENTO.estado` — exact enum from `/eventos` GET params and `PATCH /eventos/{id}/estado`. */
export type EventStatus =
  'borrador' | 'publicado' | 'en_curso' | 'finalizado' | 'cancelado'

/** `EventoCrear.tipo` — exact enum, no other values documented. */
export type EventType = 'social' | 'empresarial'

/**
 * A salón option as used by the event-creation salón picker. Mirrors
 * only the `SalonCrear` fields this feature actually needs (`nombre`,
 * `capacidad_max_mesas` — the latter needed for the SGEB-4007
 * "num_mesas must not exceed capacidad_max_mesas" cross-check). Never
 * populated from a real endpoint on this branch — see
 * `features/events/fixtures`.
 */
export interface EventSalonOption {
  idSalon: number
  nombre: string
  capacidadMaxMesas: number
}

/**
 * Temporary presentation model for the events list/card UI — NOT a
 * confirmed backend response DTO. Neither `documentacion-endpoints.txt`
 * nor the data dictionary defines a literal read/response schema for
 * "Evento"; this type is the union of `EventoCrear`'s documented
 * request fields plus the data dictionary's server-generated columns
 * (`idEvento`, `estado`, `fin`, `creadoEn`), built only so fixtures and
 * components have something typed to render. Do not treat its
 * existence as a whole as documented — see each field's own sourcing
 * note below, and treat `salonNombre`/`capitanNombre` as optional,
 * fixture-only display conveniences (no source confirms either is
 * embedded in any real list/detail response).
 *
 * Field-by-field sourcing:
 * - idEvento: data dictionary (`id_evento`, INT UNSIGNED, server PK).
 *   Kept as `number` here (the dictionary is unambiguous for events,
 *   unlike the SSO uuid/id duality) — but any route/prop boundary that
 *   would carry this as a URL param must still treat it as an opaque
 *   string, never parse/validate its format (see `EventListItem`).
 * - idSalon/idCapitan: `EventoCrear` (required FKs, both `integer`).
 * - salonNombre/capitanNombre: NOT part of any documented response
 *   schema — a UI-model convenience for display, populated from
 *   fixtures only on this branch.
 * - titulo/tipo/fecha/horaPresentacion/inicio/cupoMeseros/numMesas/
 *   tarifaPorMesero/radioGeocercaM: `EventoCrear`.
 * - estado/fin/creadoEn: data dictionary EVENTO table (server-generated,
 *   not part of `EventoCrear`).
 *
 * `comandaUrl` is deliberately absent: the upload/authoring workflow
 * for that field is unresolved (see `EventCreateFieldPrototypePage`),
 * so this presentation model does not carry it either.
 */
export interface EventListItemViewModel {
  idEvento: number
  idSalon: number
  salonNombre?: string
  idCapitan: number
  capitanNombre?: string
  titulo: string
  tipo: EventType
  fecha: string
  horaPresentacion: string
  inicio: string
  /** `null` while the event is `en_curso` — never set at creation. */
  fin: string | null
  cupoMeseros: number
  numMesas: number
  tarifaPorMesero: number
  radioGeocercaM: number
  estado: EventStatus
  creadoEn: string
}

/**
 * Local, typed filter state for the events list. Mirrors exactly the
 * four query parameters `GET /eventos` documents (`fecha_desde`,
 * `fecha_hasta`, `estado`, `id_salon`) — no text-search or
 * captain-filter field exists here because neither is documented.
 */
export interface EventsFilterState {
  estado: EventStatus | 'todos'
  fechaDesde: string | null
  fechaHasta: string | null
  idSalon: number | 'todos'
}

export const DEFAULT_EVENTS_FILTER_STATE: EventsFilterState = {
  estado: 'todos',
  fechaDesde: null,
  fechaHasta: null,
  idSalon: 'todos',
}
