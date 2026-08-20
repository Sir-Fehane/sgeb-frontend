import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type { EventStatus, EventType } from '@/features/events/types/event'
import type {
  CaptainDashboardViewModel,
  DashboardEventViewModel,
} from '@/features/dashboard/types/dashboard'

/**
 * Wire shape of one event row in `GET /dashboard/capitan`'s response —
 * confirmed against `Evento`'s own `@column` declarations
 * (`app/modules/eventos/models/evento.ts`), the same base fields present on
 * every `Evento` response regardless of preload. `salon` is present only
 * when the query that produced this row called `.preload('salon')` — Lucid
 * omits an unpreloaded `@belongsTo` relation entirely rather than sending
 * `null` — which `DashboardService.capitan` only does for `en_curso`/
 * `proximos`, not `por_cerrar` (see `types/dashboard.ts`'s own comment).
 * `capitan` is never preloaded on this endpoint at all, so it is not
 * declared here.
 */
export interface DashboardEventoApiRecord {
  id_evento: number
  id_salon: number
  titulo: string
  tipo: EventType
  fecha: string
  hora_presentacion: string
  inicio: string
  fin: string | null
  cupo_meseros: number
  num_mesas: number
  tarifa_por_mesero: number
  estado: EventStatus
  salon?: { nombre: string }
}

/**
 * Wire shape of `GET /dashboard/capitan` — confirmed field-for-field
 * against `DashboardService.capitan`'s literal return statement
 * (`app/modules/dashboard/services/dashboard_service.ts`), not against
 * `openapi-sgeb.yaml`'s `DashboardCapitan` schema (see `types/dashboard.ts`
 * for the full mismatch writeup).
 */
export interface DashboardCapitanApiRecord {
  en_curso: DashboardEventoApiRecord[]
  proximos: DashboardEventoApiRecord[]
  borradores: number
  por_cerrar: DashboardEventoApiRecord[]
  totales: {
    en_curso: number
    proximos: number
    por_cerrar: number
  }
}

function mapDashboardEvento(record: DashboardEventoApiRecord): DashboardEventViewModel {
  return {
    idEvento: record.id_evento,
    idSalon: record.id_salon,
    titulo: record.titulo,
    tipo: record.tipo,
    fecha: record.fecha,
    horaPresentacion: record.hora_presentacion,
    inicio: record.inicio,
    fin: record.fin,
    cupoMeseros: record.cupo_meseros,
    numMesas: record.num_mesas,
    tarifaPorMesero: record.tarifa_por_mesero,
    estado: record.estado,
    ...(record.salon?.nombre ? { salonNombre: record.salon.nombre } : {}),
  }
}

/**
 * Fetches the real captain/admin portfolio dashboard through the shared
 * authenticated SGEB transport. No params: the pinned backend's
 * `DashboardController.capitan` reads none (see this file's own comment on
 * `DashboardCapitanApiRecord`) — sending `fecha_desde`/`fecha_hasta`/
 * `secciones` as `openapi-sgeb.yaml` documents would just be silently
 * ignored, so this function never offers them.
 */
export async function fetchCaptainDashboard(
  signal?: AbortSignal,
): Promise<CaptainDashboardViewModel> {
  const envelope = await requestSgeb<DashboardCapitanApiRecord>({
    url: '/dashboard/capitan',
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — `responder.ok` always
    // carries the object literal `DashboardService.capitan` returns —
    // guarded defensively rather than assumed, same convention as
    // `features/events/services/eventsApi.ts`'s `fetchEventoDetalle`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  const data = envelope.data
  return {
    enCurso: data.en_curso.map(mapDashboardEvento),
    proximos: data.proximos.map(mapDashboardEvento),
    borradores: data.borradores,
    porCerrar: data.por_cerrar.map(mapDashboardEvento),
    totales: {
      enCurso: data.totales.en_curso,
      proximos: data.totales.proximos,
      porCerrar: data.totales.por_cerrar,
    },
  }
}
