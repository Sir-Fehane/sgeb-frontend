/**
 * UI domain types for staff-facing table service requests
 * (`solicitud_servicio`) — confirmed field-for-field against the pinned
 * backend's `SolicitudServicio` model
 * (`app/modules/comensal/models/solicitud_servicio.ts`) and
 * `ComensalController.listarSolicitudes`/`.cambiarEstado`. This is the
 * captain/mesero READ + resolve side only; the anonymous diner's own
 * creation flow (`POST /publico/mesas/{codigo_qr}/solicitudes`) belongs to
 * `features/public-diner`, entirely out of scope here.
 */
export type ServiceRequestType = 'atencion' | 'cuenta' | 'otro'

/**
 * `cancelada` is a real, confirmed terminal state (not in the data
 * dictionary but added via migration — see the backend model's own
 * comment) distinct from `atendida`: it exists so a request nobody
 * attends to doesn't block the table forever under the SGEB-4014
 * anti-spam rule.
 */
export type ServiceRequestStatus = 'pendiente' | 'atendida' | 'cancelada'

export interface ServiceRequestViewModel {
  idSolicitud: number
  idMesa: number
  /** `null` until someone resolves the request (or a table with no linked waiter creates one) — see the backend model's own comment. */
  idParticipacion: number | null
  tipo: ServiceRequestType
  estado: ServiceRequestStatus
  creadaEn: string
  atendidaEn: string | null
}

/** The only server-side filter this screen exposes — `id_mesa`/`id_participacion` are documented but have no clear UI need yet (see this branch's report). */
export type ServiceRequestStatusFilter = ServiceRequestStatus | 'todas'
