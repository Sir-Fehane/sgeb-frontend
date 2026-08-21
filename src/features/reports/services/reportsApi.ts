import type {
  EventMermaSummaryViewModel,
  EventRatingsSummaryViewModel,
} from '@/features/reports/types/report'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/** `puntuacion <= 2` — the same "baja" threshold `DashboardService.evento`'s `servicio.calificaciones_bajas` uses (`dashboard_service.ts`), reused here so "bajas" means the same thing on both screens. */
const LOW_RATING_THRESHOLD = 2

interface ReportesMermaListApiRecord {
  reportes: { id_reporte: number }[]
  costo_total: number
  piezas_sin_costear: number
}

/**
 * Fetches merma totals for one event through the shared authenticated
 * SGEB transport. Only the two server-computed aggregates plus a derived
 * count are mapped — the itemized `detalles` per report are Closure's own
 * concern (`EventClosureWasteReportsSection`), not duplicated here; this
 * screen deep-links to `/eventos/{id}/cierre` for that detail instead of
 * re-rendering it.
 */
export async function fetchEventMermaSummary(
  idEvento: number,
  signal?: AbortSignal,
): Promise<EventMermaSummaryViewModel> {
  const envelope = await requestSgeb<ReportesMermaListApiRecord>({
    url: `/eventos/${String(idEvento)}/reportes-merma`,
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — `listarMermas` always
    // returns the object literal — guarded defensively rather than
    // assumed, same convention as `fetchClosureReadiness`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return {
    reportesCount: envelope.data.reportes.length,
    costoTotal: envelope.data.costo_total,
    piezasSinCostear: envelope.data.piezas_sin_costear,
  }
}

interface CalificacionApiRecord {
  id_calificacion: number
  id_mesa: number
  id_participacion: number
  puntuacion: number
  comentario: string | null
  creada_en: string
}

interface CalificacionesListApiRecord {
  calificaciones: CalificacionApiRecord[]
  total: number
  promedio: number | null
}

/**
 * Fetches diner ratings for one event through the shared authenticated
 * SGEB transport — capitán/admin only server-side
 * (`ComensalController.listarCalificaciones`); a `mesero` session calling
 * this receives `SGEB-1004` (see `services/reportsApi.ts`'s caller —
 * `ReportsPage` gates this fetch by role first, same UX-only pattern
 * `EventClosurePage`'s `canFinalizeEvento` already uses, never a
 * substitute for the real server-side check). `soloBajas` sends
 * `puntuacion_max=2`, the backend's own documented filter for surfacing
 * ratings worth acting on — never simulated client-side over a full
 * fetch.
 */
export async function fetchEventRatings(
  idEvento: number,
  soloBajas: boolean,
  signal?: AbortSignal,
): Promise<EventRatingsSummaryViewModel> {
  const envelope = await requestSgeb<CalificacionesListApiRecord>({
    url: `/eventos/${String(idEvento)}/calificaciones`,
    ...(soloBajas ? { params: { puntuacion_max: LOW_RATING_THRESHOLD } } : {}),
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — guarded defensively
    // rather than assumed, same convention as `fetchEventMermaSummary`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return {
    calificaciones: envelope.data.calificaciones.map((record) => ({
      idCalificacion: record.id_calificacion,
      idMesa: record.id_mesa,
      idParticipacion: record.id_participacion,
      puntuacion: record.puntuacion,
      comentario: record.comentario,
      creadaEn: record.creada_en,
    })),
    total: envelope.data.total,
    promedio: envelope.data.promedio,
  }
}
