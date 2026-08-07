/**
 * UI domain types for the SGEB events module, derived from
 * docs/api/openapi-sgeb.yaml v1.6.0 (`EventoCrear`, `/eventos` query
 * params) and docs/data/diccionario-datos.pdf's EVENTO table.
 * `documentacion-endpoints.txt` is the older, superseded version of this
 * same OpenAPI document — `openapi-sgeb.yaml` v1.6.0 is the current
 * source of truth wherever the two disagree (see
 * refactor/events-contract-v1-6's report for the exact corrections this
 * made — most notably, this list model no longer carries any captain
 * identifier at all; see `EventListItemViewModel`'s own comment for why,
 * and `EventCreateFieldPrototypeValues`/`createEventFormSchema` for
 * where the confirmed `uuid_capitan` requirement actually lives).
 *
 * Documentation gap (flagged, not resolved): neither source defines a
 * literal read/response schema for "Evento" — only the `EventoCrear`
 * *request* shape is documented (`GET /eventos` and `GET /eventos/{id}`
 * both respond with the generic `ExitoLista`/`Exito` envelope, no
 * dedicated schema). `EventListItemViewModel` below is a necessary
 * synthesis for presentation purposes, not a literal documented schema
 * or a confirmed backend DTO — see its own comment.
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
 * confirmed backend response DTO. Neither `openapi-sgeb.yaml` nor the
 * data dictionary defines a literal read/response schema for "Evento";
 * this type is the union of `EventoCrear`'s documented
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
 * - idSalon: `EventoCrear.id_salon` (required FK, `integer`).
 * - salonNombre/capitanNombre: NOT part of any documented response
 *   schema — a UI-model convenience for display, populated from
 *   fixtures only on this branch.
 * - titulo/tipo/fecha/horaPresentacion/inicio/cupoMeseros/numMesas/
 *   tarifaPorMesero/radioGeocercaM: `EventoCrear`.
 * - estado/fin/creadoEn: data dictionary EVENTO table (server-generated,
 *   not part of `EventoCrear`).
 *
 * No captain-identifier field exists here (no `idCapitan`/`uuidCapitan`).
 * `EventoCrear.uuid_capitan` is a real, confirmed, *required* backend
 * field, but this list-presentation model has no genuine use for it:
 * the list neither displays nor filters by captain identity, no
 * event-detail route consumes it (§17 doesn't approve one), and no
 * documented read/response schema for "Evento" exists to confirm it
 * would even be embedded in a list item. `capitanNombre` alone (a
 * display-only convenience, not a mirror of any wire field) is what the
 * list renders. The confirmed `uuid_capitan` requirement is documented
 * where it genuinely belongs instead — see
 * `EventCreateFieldPrototypeValues` and `createEventFormSchema` in
 * `features/events/schemas/eventCreateSchema.ts`.
 *
 * `comandaUrl` is deliberately absent for the same reason: the
 * upload/authoring workflow for that field is unresolved (see
 * `EventCreateFieldPrototypePage`), so this presentation model does not
 * carry it either.
 */
export interface EventListItemViewModel {
  idEvento: number
  idSalon: number
  salonNombre?: string
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
 * Presentation model for the Event Detail foundation (`/eventos/:id`) —
 * NOT a confirmed `GET /eventos/{id_evento}` response DTO. The current
 * OpenAPI documents that endpoint's 200 response as the generic `Exito`
 * envelope, not a dedicated `EventDetail` schema, so this type is a
 * feature-local synthesis of confirmed `EventoCrear` fields plus the
 * server-generated `estado`, built only so fixtures/components have
 * something typed to render — same status as `EventListItemViewModel`
 * (see its own comment).
 *
 * Field-by-field sourcing, mirroring `EventListItemViewModel`:
 * - idEvento/titulo/tipo/fecha/horaPresentacion/inicio/cupoMeseros/
 *   numMesas/tarifaPorMesero/radioGeocercaM/comandaUrl: `EventoCrear`.
 * - estado: data dictionary EVENTO table (server-generated).
 * - salonNombre: NOT part of any documented `/eventos/{id}` response —
 *   a presentation-only convenience, exactly like
 *   `EventListItemViewModel.salonNombre`. (`DashboardCapitan.
 *   proximos_eventos` and `DashboardEvento.resumen` do each document a
 *   plain `salon: string` field, showing the backend has *a* display-name
 *   concept for salón elsewhere — but that's a different endpoint's
 *   response, not this one, so it still doesn't confirm this field for
 *   `GET /eventos/{id_evento}`.)
 *
 * Deliberately excluded: `uuid_capitan`/any captain identifier (no UX
 * purpose on this page, same reasoning as the list model), any
 * `DashboardEvento` field (resumen/staffing/montaje/piso/barra/comensal/
 * cierre/alertas — that's the separate, explicitly out-of-scope
 * operational dashboard), and any undocumented field (description,
 * guest count, notes, staffing counts, attendance, ...).
 */
export interface EventDetailViewModel {
  idEvento: number
  titulo: string
  tipo: EventType
  estado: EventStatus
  salonNombre?: string
  fecha: string
  horaPresentacion: string
  inicio: string
  cupoMeseros: number
  numMesas: number
  tarifaPorMesero: number
  radioGeocercaM: number
  /** `EventoCrear.comanda_url` — validated `http(s)://` only, per its documented pattern. Absent/`undefined` when not set. */
  comandaUrl?: string
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
