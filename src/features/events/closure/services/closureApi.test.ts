import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createMermaReport,
  fetchClosureReadiness,
  fetchMermaReports,
  type ClosureReadinessApiRecord,
  type ReporteMermaApiRecord,
  type ReportesMermaListApiRecord,
} from '@/features/events/closure/services/closureApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const READINESS_RECORD: ClosureReadinessApiRecord = {
  evento_finalizado: true,
  participaciones_total: 5,
  participaciones_sin_salida: 0,
  meseros_sin_clabe_vigente: 0,
  listo: true,
}

const REPORTE_RECORD: ReporteMermaApiRecord = {
  id_reporte: 42,
  id_evento: 1001,
  observaciones: 'Se rompieron al recoger el salón.',
  fecha: '2026-09-12T23:10:00Z',
  detalles: [
    {
      id_merma_det: 1,
      id_reporte: 42,
      tipo: 'copa_rota',
      descripcion: 'Copas de la barra',
      cantidad: 4,
      costo_estimado: 320,
    },
    {
      id_merma_det: 2,
      id_reporte: 42,
      tipo: 'plato_roto',
      descripcion: null,
      cantidad: 2,
      costo_estimado: null,
    },
  ],
}

describe('fetchClosureReadiness', () => {
  it('requests GET /eventos/{id}/cierre and maps every field, camelCase', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: READINESS_RECORD,
    })

    const result = await fetchClosureReadiness(1001)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/cierre' })
    expect(result).toEqual({
      eventoFinalizado: true,
      participacionesTotal: 5,
      participacionesSinSalida: 0,
      meserosSinClabeVigente: 0,
      listo: true,
    })
  })

  it('propagates the signal', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: READINESS_RECORD,
    })
    const controller = new AbortController()

    await fetchClosureReadiness(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('throws SgebNetworkError when the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(fetchClosureReadiness(1001)).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('lets a SgebApplicationError (e.g. SGEB-3001) propagate unchanged', async () => {
    const error = new Error('SGEB-3001 not found')
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(fetchClosureReadiness(999999)).rejects.toBe(error)
  })
})

describe('fetchMermaReports', () => {
  it('requests GET /eventos/{id}/reportes-merma and maps only `reportes`, ignoring the server aggregates', async () => {
    const listRecord: ReportesMermaListApiRecord = {
      reportes: [REPORTE_RECORD],
      costo_total: 320,
      piezas_sin_costear: 1,
    }
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: listRecord,
    })

    const result = await fetchMermaReports(1001)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/reportes-merma' })
    expect(result).toEqual([
      {
        idReporte: 42,
        fecha: '2026-09-12T23:10:00Z',
        observaciones: 'Se rompieron al recoger el salón.',
        detalles: [
          {
            tipo: 'copa_rota',
            descripcion: 'Copas de la barra',
            cantidad: 4,
            costoEstimado: 320,
          },
          { tipo: 'plato_roto', descripcion: null, cantidad: 2, costoEstimado: null },
        ],
      },
    ])
  })

  it('returns an empty list when the envelope carries null data', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'sin resultados' },
      data: null,
    })

    expect(await fetchMermaReports(1001)).toEqual([])
  })
})

describe('createMermaReport', () => {
  it('POSTs the given wire-shaped request body verbatim (camelCase costoEstimado) and maps the created report', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: REPORTE_RECORD,
    })

    const result = await createMermaReport(1001, {
      observaciones: 'Nota',
      detalles: [
        { tipo: 'copa_rota', descripcion: 'Barra', cantidad: 4, costoEstimado: 320 },
      ],
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/reportes-merma',
      method: 'POST',
      data: {
        observaciones: 'Nota',
        detalles: [
          { tipo: 'copa_rota', descripcion: 'Barra', cantidad: 4, costoEstimado: 320 },
        ],
      },
    })
    expect(result.idReporte).toBe(42)
  })

  it('throws SgebNetworkError when the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: null,
    })

    await expect(
      createMermaReport(1001, { detalles: [{ tipo: 'otro', cantidad: 1 }] }),
    ).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('lets a SgebApplicationError (e.g. SGEB-4013 invalid lifecycle stage) propagate unchanged', async () => {
    const error = new Error('SGEB-4013 invalid stage')
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(
      createMermaReport(1001, { detalles: [{ tipo: 'otro', cantidad: 1 }] }),
    ).rejects.toBe(error)
  })
})
