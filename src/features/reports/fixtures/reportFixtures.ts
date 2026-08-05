import type { WaiterPerformanceReportItem } from '@/features/reports/types/report'

/**
 * Development/demo fixtures only — NOT live backend data. All names,
 * ids, and financial values are fictional. Remove this whole file once
 * real API integration (a later branch) supplies `GET /dashboard/meseros`
 * responses.
 */

export const WAITER_PERFORMANCE_REPORT_FIXTURE: readonly WaiterPerformanceReportItem[] = [
  {
    uuidUsuario: 'b2c3d4e5-f6a7-4b1c-8d2e-000000000001',
    nombreCompleto: 'Ana Torres',
    eventosApartados: 12,
    asistenciasConfirmadas: 12,
    inasistencias: 0,
    porcentajeAsistencia: 100,
    calificacionPromedio: 4.8,
    calificacionesRecibidas: 12,
    montoPagado: 6000,
    montoPendiente: 0,
    clabeVigente: true,
  },
  {
    uuidUsuario: 'b2c3d4e5-f6a7-4b1c-8d2e-000000000002',
    nombreCompleto: 'Bruno Salas',
    eventosApartados: 10,
    asistenciasConfirmadas: 7,
    inasistencias: 3,
    porcentajeAsistencia: 70,
    calificacionPromedio: null,
    calificacionesRecibidas: 0,
    montoPagado: 3200,
    montoPendiente: 800,
    clabeVigente: false,
  },
  {
    uuidUsuario: 'b2c3d4e5-f6a7-4b1c-8d2e-000000000003',
    nombreCompleto: 'Carla Núñez',
    eventosApartados: 15,
    asistenciasConfirmadas: 14,
    inasistencias: 1,
    porcentajeAsistencia: 93.3,
    calificacionPromedio: 3.9,
    calificacionesRecibidas: 10,
    montoPagado: 5400,
    montoPendiente: 0,
    clabeVigente: true,
  },
  {
    uuidUsuario: 'b2c3d4e5-f6a7-4b1c-8d2e-000000000004',
    nombreCompleto: 'Diego Ramírez',
    eventosApartados: 8,
    asistenciasConfirmadas: 8,
    inasistencias: 0,
    porcentajeAsistencia: 100,
    calificacionPromedio: 4.2,
    calificacionesRecibidas: 6,
    montoPagado: 2800,
    montoPendiente: 450,
    clabeVigente: false,
  },
]

/** A valid empty result — e.g. no waiter worked in the selected range. */
export const EMPTY_WAITER_PERFORMANCE_REPORT_FIXTURE: readonly WaiterPerformanceReportItem[] =
  []
