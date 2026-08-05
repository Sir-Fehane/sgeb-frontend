import type { CaptainDashboardViewModel } from '@/features/dashboard/types/dashboard'

/**
 * Development/demo fixtures only — NOT live backend data. All event,
 * salón, and alert content is fictional (no real venue, employee, or
 * financial data). Remove this whole file once real API integration
 * (a later branch) supplies `GET /dashboard/capitan` responses.
 */

/**
 * The "happy path" — every section populated, one event `en_curso`
 * (so `operacion` has real content), a couple of upcoming events, one
 * staffing risk, and one alert per documented severity. This is the
 * fixture the routed `/panel` page renders.
 */
export const CAPTAIN_DASHBOARD_FIXTURE: CaptainDashboardViewModel = {
  generadoEn: '2026-08-05T09:00:00',
  rango: { fechaDesde: '2026-08-05', fechaHasta: '2026-09-04' },
  resumen: {
    total: 12,
    borrador: 2,
    publicados: 5,
    enCurso: 1,
    finalizados: 3,
    cancelados: 1,
  },
  proximosEventos: [
    {
      idEvento: 'dashboard-evento-demo-1',
      titulo: 'Evento de demostración — boda',
      fecha: '2026-08-12',
      horaPresentacion: '16:00',
      salon: 'Salón Roble',
      estado: 'publicado',
      cupoMeseros: 12,
      confirmados: 10,
      porcentajeCobertura: 83.3,
    },
    {
      idEvento: 'dashboard-evento-demo-2',
      titulo: 'Evento de demostración — conferencia',
      fecha: '2026-08-20',
      horaPresentacion: '08:00',
      salon: 'Jardín Norte',
      estado: 'borrador',
      cupoMeseros: 20,
      confirmados: 4,
      porcentajeCobertura: 20,
    },
  ],
  staffingRiesgo: [
    {
      idEvento: 'dashboard-evento-demo-1',
      titulo: 'Evento de demostración — boda',
      horasParaInicio: 18.5,
      faltantes: 2,
    },
  ],
  operacion: {
    idEvento: 'dashboard-evento-demo-3',
    titulo: 'Evento de demostración — en curso',
    meserosEnPiso: 8,
    mesasOcupadas: 10,
    mesasTotal: 12,
    ordenesActivas: 4,
    solicitudesPendientes: 1,
  },
  cierre: {
    eventosSinPagosCalculados: 2,
    pagosPendientes: 5,
    montoPendiente: 12500.5,
    mermaCostoEstimado: 850.25,
    calificacionPromedio: 4.6,
  },
  alertas: [
    {
      idAlerta: 'dashboard-alerta-demo-1',
      tipo: 'insumo_agotado',
      severidad: 'critica',
      mensaje: 'Se agotó el ron blanco en la barra del evento en curso.',
      codigoRelacionado: 'SGEB-4009',
      estado: 'abierta',
      creadaEn: '2026-08-05T08:40:00',
    },
    {
      idAlerta: 'dashboard-alerta-demo-2',
      tipo: 'checklist_pendiente',
      severidad: 'atencion',
      mensaje: 'Checklist de montaje pendiente de aprobar.',
      codigoRelacionado: null,
      estado: 'abierta',
      creadaEn: '2026-08-05T07:15:00',
    },
    {
      idAlerta: 'dashboard-alerta-demo-3',
      tipo: 'calificacion_baja',
      severidad: 'informativa',
      mensaje: 'Un comensal calificó el servicio con 2 estrellas.',
      codigoRelacionado: null,
      estado: 'atendida',
      creadaEn: '2026-08-04T22:10:00',
    },
  ],
}

/**
 * A valid *empty* dashboard — every section present (not `null`), with
 * zero counts / empty arrays / no current event. Demonstrates that zero
 * is a valid value, distinct from "unavailable".
 */
export const EMPTY_CAPTAIN_DASHBOARD_FIXTURE: CaptainDashboardViewModel = {
  generadoEn: '2026-08-05T09:00:00',
  rango: { fechaDesde: '2026-08-05', fechaHasta: '2026-09-04' },
  resumen: {
    total: 0,
    borrador: 0,
    publicados: 0,
    enCurso: 0,
    finalizados: 0,
    cancelados: 0,
  },
  proximosEventos: [],
  staffingRiesgo: [],
  operacion: {
    idEvento: null,
    titulo: null,
    meserosEnPiso: 0,
    mesasOcupadas: 0,
    mesasTotal: 0,
    ordenesActivas: 0,
    solicitudesPendientes: 0,
  },
  cierre: {
    eventosSinPagosCalculados: 0,
    pagosPendientes: 0,
    montoPendiente: 0,
    mermaCostoEstimado: 0,
    calificacionPromedio: null,
  },
  alertas: [],
}
