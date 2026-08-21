import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchEventMermaSummary,
  fetchEventRatings,
} from '@/features/reports/services/reportsApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
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
