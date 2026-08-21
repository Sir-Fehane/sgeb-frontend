import type {
  ServiceRequestStatus,
  ServiceRequestStatusFilter,
  ServiceRequestType,
  ServiceRequestViewModel,
} from '@/features/events/service-requests/types/serviceRequest'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of one `SolicitudServicio` row, confirmed against the pinned
 * backend model. `GET /eventos/{id_evento}/solicitudes` responds via
 * `responder.lista(ctx, filas)` with no `meta` argument, so `data` is this
 * array directly — never wrapped in `{ items, meta }` (that shape only
 * appears when a controller passes `meta` explicitly, which this one does
 * not; see `responder.lista`'s own doc comment on the pinned backend).
 */
export interface ServiceRequestApiRecord {
  id_solicitud: number
  id_mesa: number
  id_participacion: number | null
  tipo: ServiceRequestType
  estado: ServiceRequestStatus
  creada_en: string
  atendida_en: string | null
}

function mapServiceRequest(record: ServiceRequestApiRecord): ServiceRequestViewModel {
  return {
    idSolicitud: record.id_solicitud,
    idMesa: record.id_mesa,
    idParticipacion: record.id_participacion,
    tipo: record.tipo,
    estado: record.estado,
    creadaEn: record.creada_en,
    atendidaEn: record.atendida_en,
  }
}

/**
 * Fetches an event's table service requests through the shared
 * authenticated SGEB transport. `estado` is the only filter this screen
 * offers (see `types/serviceRequest.ts`) — sent as-is when not `'todas'`,
 * matching `ComensalService.listarSolicitudes`'s optional `estado` filter.
 * An empty result (`SGEB-0002`) is still a normal, non-error response —
 * `requestSgeb` never throws for it, and `envelope.data` is simply `[]`.
 */
export async function fetchServiceRequests(
  idEvento: number,
  estado: ServiceRequestStatusFilter,
  signal?: AbortSignal,
): Promise<ServiceRequestViewModel[]> {
  const envelope = await requestSgeb<ServiceRequestApiRecord[]>({
    url: `/eventos/${String(idEvento)}/solicitudes`,
    ...(estado !== 'todas' ? { params: { estado } } : {}),
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapServiceRequest)
}

/**
 * `PATCH /solicitudes/{id_solicitud}/estado` — the mesero/captain
 * resolving or discarding a request. Only `estado` is sent: the pinned
 * backend also accepts an `id_participacion` field on this request
 * (`ComensalController.cambiarEstado` reads
 * `ctx.request.input('id_participacion')`), but it is unvalidated and
 * unscoped to the caller's own participation (a confirmed backend gap —
 * see this branch's report) — sending an unverifiable value this
 * frontend cannot itself confirm is correct would misattribute who
 * resolved the request, so this call deliberately omits it and lets the
 * field stay whatever it already was (typically the waiter the table was
 * linked to at creation time).
 */
export async function updateServiceRequestStatus(
  idSolicitud: number,
  estado: 'atendida' | 'cancelada',
): Promise<ServiceRequestViewModel> {
  const envelope = await requestSgeb<ServiceRequestApiRecord>({
    url: `/solicitudes/${String(idSolicitud)}/estado`,
    method: 'PATCH',
    data: { estado },
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — `cambiarEstado` always
    // returns the updated record — guarded defensively rather than
    // assumed, same convention as `markPaymentPaid`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapServiceRequest(envelope.data)
}
