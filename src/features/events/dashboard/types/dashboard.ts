import type { EventStatus } from '@/features/events/types/event'

/**
 * UI domain types for the real per-event operational dashboard
 * (`GET /eventos/{id_evento}/dashboard`) — confirmed directly against the
 * pinned backend's `DashboardService.evento`
 * (`app/modules/dashboard/services/dashboard_service.ts`), not against
 * `openapi-sgeb.yaml`'s `DashboardEvento` schema: that schema nests event
 * metadata under a `resumen` object and declares a `generado_en`
 * timestamp, neither of which the real implementation returns (see this
 * branch's report for the full writeup). This is the operational
 * command-center view for a captain/admin inside one event — distinct
 * from `features/dashboard`'s `GET /dashboard/capitan` portfolio view.
 *
 * Every section is `null` in exactly two cases the real backend does not
 * distinguish in the response body itself: the section was never
 * requested (not applicable here — this feature always requests all
 * seven), or its computation failed server-side (SGEB-0004 partial
 * success — see `EventDashboardViewModel.partial`). A `null` section is
 * NEVER a stand-in for a real zero value; each section's own fields
 * either default to `0` (a genuine empty count) or, for
 * `servicio.promedioCalificacion`, stay `null` on purpose when there are
 * no ratings yet — see that field's own comment.
 */

export interface EventDashboardResumenViewModel {
  cupoMeseros: number
  inscritos: number
  disponibles: number
  mesas: number
  tarifaPorMesero: number
}

export interface EventDashboardAsistenciaViewModel {
  /** `Participacion.estado` → count. Keys are whatever estados exist in this event's data, never a fixed enumerated list. */
  porEstado: Record<string, number>
  llegadasFallidas: number
}

export interface EventDashboardMontajeViewModel {
  participaciones: number
  checklistAprobado: number
  instanciasAbiertas: number
}

export interface EventDashboardPisoViewModel {
  /** `Mesa.estado` (physical occupation, `libre`/`ocupada`) → count — NOT assignment/staffing meaning. See `montage/types/montage.ts` for why `mesa.estado` and assignment validity are different concepts. */
  mesasPorEstado: Record<string, number>
  asignacionesVinculadas: number
}

export interface EventDashboardBarraViewModel {
  pendientes: number
  enPreparacion: number
  dispensando: number
  pausadasPorInsumo: number
  entregadas: number
  canceladas: number
  /** `Dispensado.estado` → count. */
  dispensadosPorEstado: Record<string, number>
}

export interface EventDashboardServicioViewModel {
  solicitudesPendientes: number
  calificaciones: number
  /** `null` when there are zero calificaciones — never averaged to 0, per the backend's own documented reasoning ("un promedio de cero diría que el servicio fue pésimo"). Render as "Sin calificaciones", never as 0. */
  promedioCalificacion: number | null
  calificacionesBajas: number
}

export type EventDashboardAlertTipo =
  'botella_vacia' | 'botella_baja' | 'cubaitor_sin_conexion'
export type EventDashboardAlertSeveridad = 'alta' | 'media'

/**
 * One alert row from `CubaitorService.alertas`. Fields beyond
 * `tipo`/`codigo`/`severidad` are tipo-specific (a `botella_*` alert
 * carries `id_config`/`pin_gpio`/`id_insumo`/`insumo`/
 * `volumen_disponible_ml`, `cubaitor_sin_conexion` carries
 * `id_cubaitor`/`nombre`/`segundos_sin_reportar`) — all kept optional
 * rather than split into a discriminated union, since the UI only ever
 * needs `insumo`/`nombre` as a display label and never branches on the
 * others.
 */
export interface EventDashboardAlertViewModel {
  tipo: EventDashboardAlertTipo
  codigo: string
  severidad: EventDashboardAlertSeveridad
  insumo?: string
  volumenDisponibleMl?: number
  porcentaje?: number
  nombre?: string
  segundosSinReportar?: number
  nota?: string
}

export interface EventDashboardAlertasViewModel {
  alertas: readonly EventDashboardAlertViewModel[]
  total: number
  ordenesPausadas: number
  severidadMaxima: EventDashboardAlertSeveridad | null
}

export interface EventDashboardViewModel {
  idEvento: number
  titulo: string
  estado: EventStatus
  fecha: string
  salon: string
  resumen: EventDashboardResumenViewModel | null
  asistencia: EventDashboardAsistenciaViewModel | null
  montaje: EventDashboardMontajeViewModel | null
  piso: EventDashboardPisoViewModel | null
  barra: EventDashboardBarraViewModel | null
  servicio: EventDashboardServicioViewModel | null
  alertas: EventDashboardAlertasViewModel | null
  /**
   * `true` when the response's `result.code` was `SGEB-0004` — at least
   * one section above is `null` because its computation failed
   * server-side, not because it was never requested. The pinned backend
   * exposes which section(s) failed only inside a free-text
   * `technical_message` string, never a structured field (see
   * `services/eventDashboardApi.ts`), so the UI does not attempt to name
   * the failed section beyond "this card's own value is null" — every
   * section's own component already renders its "no disponible" state
   * whenever its value is `null`, with or without this flag.
   */
  partial: boolean
}

/** Every section name the pinned backend's `Seccion` union accepts (`dashboard_service.ts`). */
export type EventDashboardSectionName =
  'resumen' | 'asistencia' | 'montaje' | 'piso' | 'barra' | 'servicio' | 'alertas'
