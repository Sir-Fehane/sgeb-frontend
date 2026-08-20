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
 * and `EventCreateFormValues`/`createEventFormSchema` for
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
 * `Evento.capitan` — a `UsuarioBreve` embedded on every `Evento` response as
 * of OpenAPI v1.12.0, confirmed against the pinned backend snapshot
 * (`EventoService.listar`/`.obtener` `.preload('capitan', ...)`, selecting
 * exactly `uuid_usuario, nombre, apellido_paterno, apellido_materno,
 * correo`). No `telefono` — that column is selected for
 * `Participacion.usuario` but not for this relation. Always present: every
 * `Evento` has carried a required `uuid_capitan` FK since creation.
 */
export interface EventCaptainViewModel {
  uuidUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  correo: string
}

/**
 * A salón option as used by the event-creation salón picker. Mirrors the
 * `SalonCrear`/`Salon` fields this feature needs: `nombre`,
 * `capacidad_max_mesas` (the SGEB-4007 "num_mesas must not exceed
 * capacidad_max_mesas" cross-check), and `latitud`/`longitud` (confirmed
 * `Salon` fields — `services/salonesApi.ts`'s `SalonApiRecord`, field-for-
 * field against the pinned backend's `Salon` model — used only by
 * `EventGeofenceMapPreview` to center the geofence preview on the selected
 * salón; never sent back to any request).
 */
export interface EventSalonOption {
  idSalon: number
  nombre: string
  capacidadMaxMesas: number
  latitud: number
  longitud: number
}

/**
 * Presentation model for the events list/card UI. `openapi-sgeb.yaml`
 * v1.12.0's `Evento` schema is the confirmed response shape (this endpoint
 * no longer documents only the generic envelope) — see each field's own
 * sourcing note below, and treat `salonNombre` as the one remaining
 * fixture-only display convenience (no documented `Evento` field carries a
 * salón display name; `capitan`, below, IS a confirmed `Evento` field).
 *
 * Field-by-field sourcing:
 * - idEvento: data dictionary (`id_evento`, INT UNSIGNED, server PK).
 *   Kept as `number` here (the dictionary is unambiguous for events,
 *   unlike the SSO uuid/id duality) — but any route/prop boundary that
 *   would carry this as a URL param must still treat it as an opaque
 *   string, never parse/validate its format (see `EventListItem`).
 * - idSalon: `EventoCrear.id_salon` (required FK, `integer`).
 * - salonNombre: NOT part of any documented response schema — a UI-model
 *   convenience for display, populated from fixtures only.
 * - capitan: `Evento.capitan` (`UsuarioBreve`), confirmed embedded on
 *   every list/detail response as of v1.12 — see `EventCaptainViewModel`.
 * - titulo/tipo/fecha/horaPresentacion/inicio/cupoMeseros/numMesas/
 *   tarifaPorMesero/radioGeocercaM: `EventoCrear`.
 * - estado/fin/creadoEn: data dictionary EVENTO table (server-generated,
 *   not part of `EventoCrear`).
 *
 * `comandaUrl` is deliberately absent for the same reason: the real
 * contract never declares it at creation at all (`docs/decisions.md`
 * ADR-007) — it is uploaded afterward, from Event Detail, so this
 * presentation model does not carry it either.
 */
export interface EventListItemViewModel {
  idEvento: number
  idSalon: number
  salonNombre?: string
  capitan: EventCaptainViewModel
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
 *   numMesas/tarifaPorMesero/radioGeocercaM: `EventoCrear`.
 * - estado: data dictionary EVENTO table (server-generated).
 * - idSalon: `EventoCrear.id_salon` (required FK, `integer`) — same
 *   confirmed field `EventListItemViewModel` already carries. Used to
 *   resolve the real salón through the existing, separate `GET
 *   /salones/{id_salon}` endpoint (`services/salonesApi.ts`'s
 *   `fetchSalonById`), never to render anything by itself.
 * - salonNombre: NOT part of any documented `/eventos/{id}` response —
 *   a presentation-only convenience, exactly like
 *   `EventListItemViewModel.salonNombre`. (`DashboardCapitan.
 *   proximos_eventos` and `DashboardEvento.resumen` do each document a
 *   plain `salon: string` field, showing the backend has *a* display-name
 *   concept for salón elsewhere — but that's a different endpoint's
 *   response, not this one, so it still doesn't confirm this field for
 *   `GET /eventos/{id_evento}`.) Still never populated by
 *   `mapEventoToDetail` for that reason — `EventDetailPage` resolves the
 *   real name itself, separately, via `idSalon` above, and only feeds it
 *   into this same slot for display (see that page's own comment).
 * - salonLatitud/salonLongitud: same presentation-only status and same
 *   source as `salonNombre` — never populated by `mapEventoToDetail`,
 *   only overlaid by `EventDetailPage` from the same already-resolved
 *   `GET /salones/{id_salon}` response (`services/salonesApi.ts`'s
 *   `SalonDetailViewModel`, itself a direct, confirmed `Salon.latitud`/
 *   `Salon.longitud` passthrough — pre-v1.12 facts, not a new contract
 *   surface). Feeds `EventGeofenceMapPreview`'s read-only Detail preview
 *   and `EventEditForm`'s live one, without either needing its own
 *   separate salón fetch.
 * - salonAddress: same presentation-only status/source again — a single
 *   pre-formatted line (`utils/eventDetailFormatting.ts`'s
 *   `formatSalonAddress`) built from the same resolved
 *   `SalonDetailViewModel`'s `calle`/`colonia`/`cp`/`ciudad`/`estado`,
 *   `undefined` whenever none of those pieces are available. Read only by
 *   `EventDetailGeofenceSection`'s compact read-only context under the map.
 *
 * `capitan`: `Evento.capitan` (`UsuarioBreve`), confirmed embedded on
 * `GET /eventos/{id_evento}` as of v1.12 — see `EventCaptainViewModel`.
 *
 * Deliberately excluded: any `DashboardEvento` field (resumen/staffing/
 * montaje/piso/barra/comensal/cierre/alertas — that's the separate,
 * explicitly out-of-scope operational dashboard), and any undocumented
 * field (description, guest count, notes, staffing counts, attendance, ...).
 *
 * `comandaUrl` is likewise deliberately absent, and for a different
 * reason than the fields above: `Evento.comanda_url` is a real, always-
 * present wire field, but it documents an **internal object-storage
 * key**, never a public URL (`docs/decisions.md` ADR-007;
 * `openapi-sgeb.yaml`'s own description: "NO es una URL pública").
 * Comanda is its own server resource with its own dedicated endpoints
 * (`GET/POST/DELETE /eventos/{id}/comanda`, `.../archivo`,
 * `.../historial`) — see `types/comanda.ts` and
 * `services/comandaApi.ts` — and is fetched/cached independently
 * (`queries/comandaQueryKeys.ts`), never folded into this Event Detail
 * view model. `services/eventsApi.ts`'s `mapEventoToDetail` still reads
 * `record.comanda_url` off the wire response only to confirm it must
 * never be mapped here — see that function's own comment.
 */
export interface EventDetailViewModel {
  idEvento: number
  idSalon: number
  titulo: string
  tipo: EventType
  estado: EventStatus
  salonNombre?: string
  salonLatitud?: number
  salonLongitud?: number
  salonAddress?: string
  capitan: EventCaptainViewModel
  fecha: string
  horaPresentacion: string
  inicio: string
  cupoMeseros: number
  numMesas: number
  tarifaPorMesero: number
  radioGeocercaM: number
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
