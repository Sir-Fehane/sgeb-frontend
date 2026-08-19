import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { EventSalonOption } from '@/features/events/types/event'

/**
 * Wire shape of one `Salon` row, confirmed field-for-field against the
 * pinned backend's `app/modules/eventos/models/salon.ts` (every `@column`
 * there sets a matching `serializeAs`, except the primary key which is
 * exposed as `id_salon`).
 *
 * Field-name note: `estado` here is the salón's Mexican state/province
 * (address component) — an unrelated, same-named field to `EVENTO.estado`
 * (the lifecycle status typed as `EventStatus` elsewhere in this feature).
 * Never confuse the two; this interface never imports `EventStatus`.
 */
export interface SalonApiRecord {
  id_salon: number
  nombre: string
  calle: string
  cp: string
  colonia: string
  ciudad: string
  estado: string
  latitud: number
  longitud: number
  capacidad_max_mesas: number
  capacidad_personas: number
  activo: boolean
}

/**
 * `GET /salones` query parameters this call actually sends — mirrors the
 * pinned backend's `filtrosValidator`
 * (`app/modules/eventos/controllers/salones_controller.ts`), which accepts
 * only `activo` and `q`. The event-creation salón selector always sends
 * `activo: true` — an inactive (deactivated) salón is never a valid choice
 * for a new event (`EventoService.crear` itself rejects it with
 * `SGEB-4021`/"desactivado"), so filtering it out here is presenting the
 * same rule the server would enforce anyway, not inventing a new one.
 */
export interface SalonesListParams {
  activo?: boolean
  q?: string
}

/**
 * Maps one `Salon` wire record to the event-creation salón picker's option
 * shape. Only `idSalon`/`nombre`/`capacidadMaxMesas` are needed there (the
 * latter for the client-side SGEB-4007 cross-check against `numMesas`) —
 * the address/geolocation fields have no UI use in that picker.
 */
export function mapSalonToOption(record: SalonApiRecord): EventSalonOption {
  return {
    idSalon: record.id_salon,
    nombre: record.nombre,
    capacidadMaxMesas: record.capacidad_max_mesas,
  }
}

/**
 * Fetches active salones for the event-creation picker through the shared
 * authenticated SGEB transport. Resolves to the mapped list regardless of
 * `SGEB-0000` vs `SGEB-0002` (empty result), same pattern as
 * `eventsApi.ts`'s `fetchEventos`.
 */
export async function fetchSalones(
  params: SalonesListParams,
  signal?: AbortSignal,
): Promise<EventSalonOption[]> {
  const envelope = await requestSgeb<SalonApiRecord[]>({
    url: '/salones',
    params: params as Record<string, unknown>,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapSalonToOption)
}

/**
 * Event Detail's Salón field needs a name plus enough address context to
 * be actually useful (not just "integrated") — `nombre`/`ciudad`/`estado`
 * only, the smallest addition that improves on a bare name. No
 * capacity/coordinates: nothing on Event Detail compares against
 * `capacidadMaxMesas` (that cross-check is `EventCreateForm`'s own,
 * client-side-only SGEB-4007 concern) and no map/geocoding exists here to
 * plot latitud/longitud (explicitly out of scope — see this branch's
 * report).
 */
export interface SalonDetailViewModel {
  idSalon: number
  nombre: string
  ciudad: string
  estado: string
}

/** Maps only the fields `SalonDetailViewModel` needs — see that type's own comment for why the rest of `SalonApiRecord` is left out. */
export function mapSalonToDetail(record: SalonApiRecord): SalonDetailViewModel {
  return {
    idSalon: record.id_salon,
    nombre: record.nombre,
    ciudad: record.ciudad,
    estado: record.estado,
  }
}

/**
 * `GET /salones/{id_salon}` — a real, documented, already-implemented
 * endpoint (`docs/api/openapi-sgeb.yaml`; the pinned backend's
 * `SalonesController.mostrar`), not called from anywhere in this codebase
 * before this branch. Used by `EventDetailPage` to resolve the real salón
 * behind `Evento.id_salon` (see `types/event.ts`'s own comment for why
 * `mapEventoToDetail` can't just embed the name itself).
 *
 * Confirmed against the pinned backend's route table
 * (`start/routes.ts`): this endpoint sits in the same `capitan`/`admin`
 * -only route group as `GET /salones` and `POST /salones` — a `mesero`
 * session gets `SGEB-1004` here even though `GET /eventos/{id_evento}`
 * itself is open to any authenticated role. `EventDetailPage` accounts for
 * this by never even calling this function for a session that isn't
 * `capitan`/`admin` (the exact same role check the "crear salón" fallback
 * already gates on) — a guaranteed-403 request would be pure noise, not a
 * genuine attempt. See this branch's report for the full writeup of that
 * gap; it is a backend contract fact, not something this function or its
 * caller works around.
 *
 * No `SalonesListParams`-style filter here — the path segment is the only
 * input, exactly like `fetchEventoDetalle`.
 */
export async function fetchSalonById(
  idSalon: number,
  signal?: AbortSignal,
): Promise<SalonDetailViewModel> {
  const envelope = await requestSgeb<SalonApiRecord>({
    url: `/salones/${String(idSalon)}`,
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful lookup
    // always returns the Salon record — guarded defensively rather than
    // assumed, same as `fetchEventoDetalle`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapSalonToDetail(envelope.data)
}

/**
 * `POST /salones` request body — exact field set confirmed against the
 * pinned backend's `salonValidator`
 * (`app/modules/eventos/controllers/salones_controller.ts`). This branch
 * only ever calls this from the event-creation flow's "no encuentro mi
 * salón" fallback (see `EventCreateSalonForm`) — no standalone Salon
 * management screen, no edit/deactivate. See this branch's report for why:
 * `POST /eventos` requires an existing, active `id_salon` and the pinned
 * backend has no seeder, so a clean environment has zero salones until one
 * is created through this endpoint.
 */
export interface CreateSalonRequest {
  nombre: string
  calle: string
  cp: string
  colonia: string
  ciudad: string
  estado: string
  latitud: number
  longitud: number
  capacidadMaxMesas: number
  capacidadPersonas: number
}

/**
 * Creates a salón and returns it already mapped to the picker's option
 * shape, so the caller can immediately pass its `idSalon` back into
 * `EventCreateForm`'s `selectedSalonId` to auto-select it — no separate
 * lookup round-trip needed.
 */
export async function createSalon(
  request: CreateSalonRequest,
): Promise<EventSalonOption> {
  const envelope = await requestSgeb<SalonApiRecord>({
    url: '/salones',
    method: 'POST',
    data: request,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful creation
    // always returns the created Salon — guarded defensively rather than
    // assumed, same as `eventsApi.ts`'s `createEvento`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapSalonToOption(envelope.data)
}
