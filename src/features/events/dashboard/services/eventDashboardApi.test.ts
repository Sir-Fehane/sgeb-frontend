import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchEventDashboard,
  type EventDashboardApiRecord,
} from '@/features/events/dashboard/services/eventDashboardApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const FULL_RECORD: EventDashboardApiRecord = {
  id_evento: 1001,
  titulo: 'Boda Pérez',
  estado: 'en_curso',
  fecha: '2026-09-12',
  salon: 'Jardín Central',
  resumen: {
    cupo_meseros: 10,
    inscritos: 8,
    disponibles: 2,
    mesas: 20,
    tarifa_por_mesero: 350,
  },
  asistencia: { por_estado: { vinculo: 6, apartado: 2 }, llegadas_fallidas: 1 },
  montaje: { participaciones: 8, checklist_aprobado: 5, instancias_abiertas: 3 },
  piso: { mesas_por_estado: { libre: 15, ocupada: 5 }, asignaciones_vinculadas: 8 },
  barra: {
    pendientes: 2,
    en_preparacion: 1,
    dispensando: 0,
    pausadas_por_insumo: 0,
    entregadas: 10,
    canceladas: 1,
    dispensados_por_estado: { ok: 10, error: 1 },
  },
  servicio: {
    solicitudes_pendientes: 3,
    calificaciones: 4,
    promedio_calificacion: 4.5,
    calificaciones_bajas: 0,
  },
  alertas: {
    alertas: [
      { tipo: 'botella_vacia', codigo: 'SGEB-4009', severidad: 'alta', insumo: 'Ron' },
    ],
    total: 1,
    ordenes_pausadas: 1,
    severidad_maxima: 'alta',
  },
}

describe('fetchEventDashboard', () => {
  it('requests GET /eventos/{id}/dashboard and maps every section, camelCase', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: FULL_RECORD,
    })

    const result = await fetchEventDashboard(1001)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/dashboard' })
    expect(result.idEvento).toBe(1001)
    expect(result.resumen).toEqual({
      cupoMeseros: 10,
      inscritos: 8,
      disponibles: 2,
      mesas: 20,
      tarifaPorMesero: 350,
    })
    expect(result.servicio?.promedioCalificacion).toBe(4.5)
    expect(result.alertas?.alertas[0]).toEqual({
      tipo: 'botella_vacia',
      codigo: 'SGEB-4009',
      severidad: 'alta',
      insumo: 'Ron',
    })
    expect(result.partial).toBe(false)
  })

  it('marks the result partial and preserves null sections on a SGEB-0004 response, never faking zeroes', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: {
        code: 'SGEB-0004',
        message: 'Mostramos la información disponible.',
        technical_message: 'Agregado parcial. Secciones fallidas: barra, alertas.',
      },
      data: { ...FULL_RECORD, barra: null, alertas: null },
    })

    const result = await fetchEventDashboard(1001)

    expect(result.partial).toBe(true)
    expect(result.barra).toBeNull()
    expect(result.alertas).toBeNull()
    // Sections that succeeded still render real data, not blanked out.
    expect(result.resumen).not.toBeNull()
  })

  it('never renders a real zero average as "no ratings" — promedioCalificacion stays null only when the backend says so', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        ...FULL_RECORD,
        servicio: {
          ...FULL_RECORD.servicio!,
          promedio_calificacion: null,
          calificaciones: 0,
        },
      },
    })

    const result = await fetchEventDashboard(1001)

    expect(result.servicio?.promedioCalificacion).toBeNull()
  })

  it('throws SgebNetworkError when data is null', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(fetchEventDashboard(1001)).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('propagates the signal', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: FULL_RECORD,
    })
    const controller = new AbortController()

    await fetchEventDashboard(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/dashboard',
      signal: controller.signal,
    })
  })
})
