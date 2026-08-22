import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchEventMermaSummary,
  fetchEventRatings,
  fetchWaiterPerformance,
  toWaiterPerformanceListParams,
  WaiterPerformanceInvalidWaiterError,
} from '@/features/reports/services/reportsApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

describe('fetchEventMermaSummary', () => {
  it('maps the server-computed aggregates and derives reportesCount from the array length', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        reportes: [{ id_reporte: 1 }, { id_reporte: 2 }],
        costo_total: 470,
        piezas_sin_costear: 1,
      },
    })

    const result = await fetchEventMermaSummary(1001)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/reportes-merma' })
    expect(result).toEqual({ reportesCount: 2, costoTotal: 470, piezasSinCostear: 1 })
  })

  it('throws SgebNetworkError when data is null', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(fetchEventMermaSummary(1001)).rejects.toBeInstanceOf(SgebNetworkError)
  })
})

describe('fetchEventRatings', () => {
  it('requests without puntuacion_max when soloBajas is false', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { calificaciones: [], total: 0, promedio: null },
    })

    await fetchEventRatings(1001, false)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/calificaciones' })
  })

  it('sends puntuacion_max=2 when soloBajas is true', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { calificaciones: [], total: 0, promedio: null },
    })

    await fetchEventRatings(1001, true)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/calificaciones',
      params: { puntuacion_max: 2 },
    })
  })

  it('maps calificaciones camelCase and never fabricates a zero average when promedio is null', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        calificaciones: [
          {
            id_calificacion: 1,
            id_mesa: 5,
            id_participacion: 40,
            puntuacion: 5,
            comentario: 'Excelente',
            creada_en: '2026-09-12T20:00:00Z',
          },
        ],
        total: 1,
        promedio: null,
      },
    })

    const result = await fetchEventRatings(1001, false)

    expect(result.promedio).toBeNull()
    expect(result.calificaciones[0]).toEqual({
      idCalificacion: 1,
      idMesa: 5,
      idParticipacion: 40,
      puntuacion: 5,
      comentario: 'Excelente',
      creadaEn: '2026-09-12T20:00:00Z',
    })
  })
})

const DESEMPENO_RECORD = {
  uuid_usuario: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  nombre: 'Juan',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Gómez',
  eventos_trabajados: 4,
  asistencias: 3,
  faltas: 1,
  pagos_acumulados: 1200,
  pagos_recibidos: 900,
  por_cobrar: 300,
  calificaciones_recibidas: 3,
  promedio_calificacion: 4.5,
  calificaciones_bajas: 0,
  solicitudes_atendidas: 10,
  segundos_respuesta_promedio: 90,
  puntualidad: null,
}

describe('fetchWaiterPerformance', () => {
  it('sends only fechaDesde/fechaHasta (camelCase) when no optional params are given', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        items: [],
        meta: {
          page: 1,
          page_size: 25,
          total: 0,
          last_page: 1,
          periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
        },
      },
    })

    await fetchWaiterPerformance({ fechaDesde: '2026-08-01', fechaHasta: '2026-08-31' })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/reportes/desempeno-meseros',
      params: { fechaDesde: '2026-08-01', fechaHasta: '2026-08-31' },
    })
  })

  it('sends uuidMesero/page/pageSize (camelCase) only when provided', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        items: [],
        meta: {
          page: 2,
          page_size: 10,
          total: 0,
          last_page: 1,
          periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
        },
      },
    })

    await fetchWaiterPerformance({
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
      uuidMesero: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      page: 2,
      pageSize: 10,
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/reportes/desempeno-meseros',
      params: {
        fechaDesde: '2026-08-01',
        fechaHasta: '2026-08-31',
        uuidMesero: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        page: 2,
        pageSize: 10,
      },
    })
  })

  it('maps items (snake_case -> camelCase) and meta.{page_size,last_page} -> {pageSize,lastPage}', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        items: [DESEMPENO_RECORD],
        meta: {
          page: 1,
          page_size: 25,
          total: 1,
          last_page: 1,
          periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
        },
      },
    })

    const result = await fetchWaiterPerformance({
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
    })

    expect(result.items).toEqual([
      {
        uuidUsuario: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        nombreCompleto: 'Juan Pérez Gómez',
        eventosTrabajados: 4,
        asistencias: 3,
        faltas: 1,
        pagosAcumulados: 1200,
        pagosRecibidos: 900,
        porCobrar: 300,
        calificacionesRecibidas: 3,
        promedioCalificacion: 4.5,
        calificacionesBajas: 0,
        solicitudesAtendidas: 10,
        segundosRespuestaPromedio: 90,
      },
    ])
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 25,
      total: 1,
      lastPage: 1,
      periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
    })
  })

  it('never fabricates a zero average/response time — null passes through untouched', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        items: [
          {
            ...DESEMPENO_RECORD,
            promedio_calificacion: null,
            segundos_respuesta_promedio: null,
          },
        ],
        meta: {
          page: 1,
          page_size: 25,
          total: 1,
          last_page: 1,
          periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
        },
      },
    })

    const result = await fetchWaiterPerformance({
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
    })

    expect(result.items[0]?.promedioCalificacion).toBeNull()
    expect(result.items[0]?.segundosRespuestaPromedio).toBeNull()
  })

  it('resolves normally with an empty items array for SGEB-0002 (no results)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: {
        code: 'SGEB-0002',
        message: 'No encontramos resultados con esos criterios.',
      },
      data: {
        items: [],
        meta: {
          page: 1,
          page_size: 25,
          total: 0,
          last_page: 1,
          periodo: { desde: '2026-08-01', hasta: '2026-08-31' },
        },
      },
    })

    const result = await fetchWaiterPerformance({
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
    })

    expect(result.items).toEqual([])
    expect(result.meta.total).toBe(0)
  })

  it('throws SgebNetworkError when data is null', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(
      fetchWaiterPerformance({ fechaDesde: '2026-08-01', fechaHasta: '2026-08-31' }),
    ).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('rethrows a SGEB-1003 as WaiterPerformanceInvalidWaiterError only when uuidMesero was sent', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(401, {
        code: 'SGEB-1003',
        message: 'No pudimos validar tu sesión.',
      }),
    )

    await expect(
      fetchWaiterPerformance({
        fechaDesde: '2026-08-01',
        fechaHasta: '2026-08-31',
        uuidMesero: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }),
    ).rejects.toBeInstanceOf(WaiterPerformanceInvalidWaiterError)
  })

  it('never reinterprets a SGEB-1003 as an invalid-waiter error when no uuidMesero was sent — real session errors keep their normal meaning', async () => {
    const sessionExpired = new SgebApplicationError(401, {
      code: 'SGEB-1003',
      message: 'No pudimos validar tu sesión.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(sessionExpired)

    await expect(
      fetchWaiterPerformance({ fechaDesde: '2026-08-01', fechaHasta: '2026-08-31' }),
    ).rejects.toBe(sessionExpired)
  })
})

describe('toWaiterPerformanceListParams', () => {
  it('omits uuidMesero when the filter is "todos" (null)', () => {
    expect(
      toWaiterPerformanceListParams(
        { fechaDesde: '2026-08-01', fechaHasta: '2026-08-31', uuidMesero: null },
        1,
        25,
      ),
    ).toEqual({
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
      page: 1,
      pageSize: 25,
    })
  })

  it('includes uuidMesero when one waiter is selected', () => {
    expect(
      toWaiterPerformanceListParams(
        {
          fechaDesde: '2026-08-01',
          fechaHasta: '2026-08-31',
          uuidMesero: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        },
        2,
        25,
      ),
    ).toEqual({
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
      uuidMesero: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      page: 2,
      pageSize: 25,
    })
  })
})
