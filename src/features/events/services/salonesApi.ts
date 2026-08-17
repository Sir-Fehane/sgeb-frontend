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
