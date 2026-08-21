import type {
  EventDashboardAlertasViewModel,
  EventDashboardAlertTipo,
  EventDashboardAlertSeveridad,
  EventDashboardAsistenciaViewModel,
  EventDashboardBarraViewModel,
  EventDashboardMontajeViewModel,
  EventDashboardPisoViewModel,
  EventDashboardResumenViewModel,
  EventDashboardServicioViewModel,
  EventDashboardViewModel,
} from '@/features/events/dashboard/types/dashboard'
import type { EventStatus } from '@/features/events/types/event'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/** `SGEB-0004` — partial-success aggregate read, per this endpoint's own catalog entry (`app/shared/errors/catalogo.ts`). Not in `shared/api/sgebCodes.ts`: that file documents only the cross-cutting 1xxx token codes, per its own comment — this is a business code owned by this feature. */
const PARTIAL_SUCCESS_CODE = 'SGEB-0004'

interface ResumenApiRecord {
  cupo_meseros: number
  inscritos: number
  disponibles: number
  mesas: number
  tarifa_por_mesero: number
}

interface AsistenciaApiRecord {
  por_estado: Record<string, number>
  llegadas_fallidas: number
}

interface MontajeApiRecord {
  participaciones: number
  checklist_aprobado: number
  instancias_abiertas: number
}

interface PisoApiRecord {
  mesas_por_estado: Record<string, number>
  asignaciones_vinculadas: number
}

interface BarraApiRecord {
  pendientes: number
  en_preparacion: number
  dispensando: number
  pausadas_por_insumo: number
  entregadas: number
  canceladas: number
  dispensados_por_estado: Record<string, number>
}

interface ServicioApiRecord {
  solicitudes_pendientes: number
  calificaciones: number
  promedio_calificacion: number | null
  calificaciones_bajas: number
}

interface AlertaApiRecord {
  tipo: EventDashboardAlertTipo
  codigo: string
  severidad: EventDashboardAlertSeveridad
  id_config?: number
  pin_gpio?: number
  id_insumo?: number
  insumo?: string
  volumen_disponible_ml?: number
  porcentaje?: number
  id_cubaitor?: number
  nombre?: string
  segundos_sin_reportar?: number
  nota?: string
}

interface AlertasApiRecord {
  alertas: AlertaApiRecord[]
  total: number
  ordenes_pausadas: number
  severidad_maxima: EventDashboardAlertSeveridad | null
}

/**
 * Wire shape of `GET /eventos/{id_evento}/dashboard`'s `data` — confirmed
 * field-for-field against `DashboardService.evento`'s literal return
 * (`dashboard_service.ts`), not `openapi-sgeb.yaml`'s `DashboardEvento`
 * (see `types/dashboard.ts`'s module comment for the mismatch). Since this
 * feature never sends `?secciones=`, every section key is always present
 * on the response — a `null` value means SGEB-0004 partial failure for
 * that section, never an omitted key.
 */
export interface EventDashboardApiRecord {
  id_evento: number
  titulo: string
  estado: EventStatus
  fecha: string
  salon: string
  resumen: ResumenApiRecord | null
  asistencia: AsistenciaApiRecord | null
  montaje: MontajeApiRecord | null
  piso: PisoApiRecord | null
  barra: BarraApiRecord | null
  servicio: ServicioApiRecord | null
  alertas: AlertasApiRecord | null
}

function mapAlerta(
  record: AlertaApiRecord,
): EventDashboardAlertasViewModel['alertas'][number] {
  return {
    tipo: record.tipo,
    codigo: record.codigo,
    severidad: record.severidad,
    ...(record.insumo !== undefined ? { insumo: record.insumo } : {}),
    ...(record.volumen_disponible_ml !== undefined
      ? { volumenDisponibleMl: record.volumen_disponible_ml }
      : {}),
    ...(record.porcentaje !== undefined ? { porcentaje: record.porcentaje } : {}),
    ...(record.nombre !== undefined ? { nombre: record.nombre } : {}),
    ...(record.segundos_sin_reportar !== undefined
      ? { segundosSinReportar: record.segundos_sin_reportar }
      : {}),
    ...(record.nota !== undefined ? { nota: record.nota } : {}),
  }
}

/**
 * Maps the full wire record to the view model. Deliberately mirrors the
 * backend's own SGEB-0004 shape: a `null` section stays `null`, never
 * defaulted to an empty object or zeroed-out fields — a component that
 * only knows how to render zeroes would otherwise be unable to tell
 * "no data" from "computation failed," exactly the confusion the pinned
 * backend's own `promedio_calificacion` comment warns against.
 */
function mapEventDashboard(
  record: EventDashboardApiRecord,
  partial: boolean,
): EventDashboardViewModel {
  return {
    idEvento: record.id_evento,
    titulo: record.titulo,
    estado: record.estado,
    fecha: record.fecha,
    salon: record.salon,
    resumen: record.resumen
      ? ({
          cupoMeseros: record.resumen.cupo_meseros,
          inscritos: record.resumen.inscritos,
          disponibles: record.resumen.disponibles,
          mesas: record.resumen.mesas,
          tarifaPorMesero: record.resumen.tarifa_por_mesero,
        } satisfies EventDashboardResumenViewModel)
      : null,
    asistencia: record.asistencia
      ? ({
          porEstado: record.asistencia.por_estado,
          llegadasFallidas: record.asistencia.llegadas_fallidas,
        } satisfies EventDashboardAsistenciaViewModel)
      : null,
    montaje: record.montaje
      ? ({
          participaciones: record.montaje.participaciones,
          checklistAprobado: record.montaje.checklist_aprobado,
          instanciasAbiertas: record.montaje.instancias_abiertas,
        } satisfies EventDashboardMontajeViewModel)
      : null,
    piso: record.piso
      ? ({
          mesasPorEstado: record.piso.mesas_por_estado,
          asignacionesVinculadas: record.piso.asignaciones_vinculadas,
        } satisfies EventDashboardPisoViewModel)
      : null,
    barra: record.barra
      ? ({
          pendientes: record.barra.pendientes,
          enPreparacion: record.barra.en_preparacion,
          dispensando: record.barra.dispensando,
          pausadasPorInsumo: record.barra.pausadas_por_insumo,
          entregadas: record.barra.entregadas,
          canceladas: record.barra.canceladas,
          dispensadosPorEstado: record.barra.dispensados_por_estado,
        } satisfies EventDashboardBarraViewModel)
      : null,
    servicio: record.servicio
      ? ({
          solicitudesPendientes: record.servicio.solicitudes_pendientes,
          calificaciones: record.servicio.calificaciones,
          promedioCalificacion: record.servicio.promedio_calificacion,
          calificacionesBajas: record.servicio.calificaciones_bajas,
        } satisfies EventDashboardServicioViewModel)
      : null,
    alertas: record.alertas
      ? {
          alertas: record.alertas.alertas.map(mapAlerta),
          total: record.alertas.total,
          ordenesPausadas: record.alertas.ordenes_pausadas,
          severidadMaxima: record.alertas.severidad_maxima,
        }
      : null,
    partial,
  }
}

/**
 * Fetches the real per-event operational dashboard through the shared
 * authenticated SGEB transport. Always requests every section (no
 * `?secciones=`, so the backend defaults to all seven) — see
 * `types/dashboard.ts`'s module comment for why this feature has no
 * partial-fetch use case yet.
 *
 * SGEB-0004 (partial success) is still an HTTP 200 with a valid envelope,
 * so `requestSgeb` resolves normally rather than throwing — this function
 * reads `envelope.result.code` itself to detect it, the same signal
 * `responder.parcial` (backend) uses to distinguish it from `SGEB-0000`.
 */
export async function fetchEventDashboard(
  idEvento: number,
  signal?: AbortSignal,
): Promise<EventDashboardViewModel> {
  const envelope = await requestSgeb<EventDashboardApiRecord>({
    url: `/eventos/${String(idEvento)}/dashboard`,
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend for a full or partial
    // success — `DashboardService.evento` always returns the object
    // literal — guarded defensively rather than assumed, same convention
    // as `fetchEventoDetalle`/`fetchCaptainDashboard`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapEventDashboard(envelope.data, envelope.result.code === PARTIAL_SUCCESS_CODE)
}
