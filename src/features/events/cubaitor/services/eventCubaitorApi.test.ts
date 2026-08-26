import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cambiarEstadoOrden,
  createConfigDispensado,
  dispensarDetalle,
  fetchAlertasEvento,
  fetchOrdenesEvento,
  recargarConfigDispensado,
  reportarDispensado,
  updateConfigDispensado,
} from '@/features/events/cubaitor/services/eventCubaitorApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

describe('fetchOrdenesEvento', () => {
  it('sends only `estado`/`id_mesa` query params — the pinned backend implements no others despite OpenAPI documenting page/page_size/id_participacion', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [],
    })

    await fetchOrdenesEvento(1001, { estado: 'pendiente', idMesa: 7 })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/ordenes',
      params: { estado: 'pendiente', id_mesa: 7 },
    })
  })

  it('maps a full order with nested detalles, snake_case wire → camelCase view model', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        {
          id_orden: 501,
          id_mesa: 7,
          id_participacion: 20,
          estado: 'pendiente',
          creada_en: '2026-08-21T20:00:00Z',
          entregada_en: null,
          detalles: [
            {
              id_detalle: 1,
              id_orden: 501,
              id_bebida: 9,
              id_envase: 3,
              cantidad: 2,
              volumen_total_ml: 700,
              estado: 'pendiente',
              dispensados: [],
            },
          ],
        },
      ],
    })

    const [orden] = await fetchOrdenesEvento(1001)

    expect(orden).toEqual({
      idOrden: 501,
      idMesa: 7,
      idParticipacion: 20,
      estado: 'pendiente',
      creadaEn: '2026-08-21T20:00:00Z',
      entregadaEn: null,
      detalles: [
        {
          idDetalle: 1,
          idOrden: 501,
          idBebida: 9,
          idEnvase: 3,
          cantidad: 2,
          volumenTotalMl: 700,
          estado: 'pendiente',
          dispensados: [],
        },
      ],
    })
  })

  it("maps a detail's nested dispensados[] (v1.16) — the durable reload-reconstruction source, snake_case → camelCase", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        {
          id_orden: 501,
          id_mesa: 7,
          id_participacion: 20,
          estado: 'en_preparacion',
          creada_en: '2026-08-21T20:00:00Z',
          entregada_en: null,
          detalles: [
            {
              id_detalle: 1,
              id_orden: 501,
              id_bebida: 9,
              id_envase: 3,
              cantidad: 2,
              volumen_total_ml: 700,
              estado: 'dispensada',
              dispensados: [
                {
                  id_dispensado: 900,
                  id_detalle: 1,
                  id_config: 5,
                  volumen_solicitado_ml: 45,
                  segundos_calculado: 2.9,
                  segundos_real: null,
                  volumen_real_estimado_ml: null,
                  estado: 'ok',
                  timestamp: '2026-08-21T20:01:00Z',
                },
              ],
            },
          ],
        },
      ],
    })

    const [orden] = await fetchOrdenesEvento(1001)

    expect(orden?.detalles[0]?.dispensados).toEqual([
      {
        idDispensado: 900,
        idDetalle: 1,
        idConfig: 5,
        volumenSolicitadoMl: 45,
        segundosCalculado: 2.9,
        segundosReal: null,
        volumenRealEstimadoMl: null,
        estado: 'ok',
        timestamp: '2026-08-21T20:01:00Z',
      },
    ])
  })
})

describe('cambiarEstadoOrden', () => {
  it('PATCHes /ordenes/{id}/estado with exactly { estado }', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_orden: 501,
        id_mesa: 7,
        id_participacion: 20,
        estado: 'cancelada',
        creada_en: '2026-08-21T20:00:00Z',
        entregada_en: null,
        detalles: [],
      },
    })

    await cambiarEstadoOrden(501, 'cancelada')

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/ordenes/501/estado',
      method: 'PATCH',
      data: { estado: 'cancelada' },
    })
  })
})

describe('dispensarDetalle', () => {
  it('maps the confirmed real response shape — data: Dispensado[], not the old bespoke wrapper', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: [
        {
          id_dispensado: 900,
          id_detalle: 1,
          id_config: 12,
          volumen_solicitado_ml: 45,
          segundos_calculado: 2.9,
          segundos_real: null,
          volumen_real_estimado_ml: null,
          estado: 'ok',
          timestamp: '2026-08-25T10:00:00.000Z',
        },
        {
          id_dispensado: 901,
          id_detalle: 1,
          id_config: 13,
          volumen_solicitado_ml: 250,
          segundos_calculado: 10,
          segundos_real: null,
          volumen_real_estimado_ml: null,
          estado: 'ok',
          timestamp: '2026-08-25T10:00:00.000Z',
        },
      ],
    })

    const result = await dispensarDetalle(1)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/orden-detalles/1/dispensar',
      method: 'POST',
    })
    expect(result).toEqual([
      {
        idDispensado: 900,
        idDetalle: 1,
        idConfig: 12,
        volumenSolicitadoMl: 45,
        segundosCalculado: 2.9,
        segundosReal: null,
        volumenRealEstimadoMl: null,
        estado: 'ok',
        timestamp: '2026-08-25T10:00:00.000Z',
      },
      {
        idDispensado: 901,
        idDetalle: 1,
        idConfig: 13,
        volumenSolicitadoMl: 250,
        segundosCalculado: 10,
        segundosReal: null,
        volumenRealEstimadoMl: null,
        estado: 'ok',
        timestamp: '2026-08-25T10:00:00.000Z',
      },
    ])
  })
})

describe('reportarDispensado', () => {
  it('PATCHes /dispensados/{id}/reporte with exactly { segundos_real } — snake_case (reporteValidator), regression test for the SGEB-2001 casing bug, and never sends `estado` (always server-computed)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_dispensado: 900,
        id_detalle: 1,
        id_config: 5,
        volumen_solicitado_ml: 45,
        segundos_calculado: 2.9,
        segundos_real: 2.9,
        volumen_real_estimado_ml: 45,
        estado: 'ok',
        timestamp: '2026-08-21T20:01:00Z',
      },
    })

    await reportarDispensado(900, 2.9)

    // Exact-shape assertion above already proves no `estado` key was sent —
    // `toHaveBeenCalledWith` requires the call's `data` to match exactly.
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/dispensados/900/reporte',
      method: 'PATCH',
      data: { segundos_real: 2.9 },
    })
  })

  it('supports a null segundos_real (device-timeout fallback) — the validator requires the key to be present even though the value is nullable', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_dispensado: 900,
        id_detalle: 1,
        id_config: 5,
        volumen_solicitado_ml: 45,
        segundos_calculado: 2.9,
        segundos_real: null,
        volumen_real_estimado_ml: null,
        estado: 'error',
        timestamp: '2026-08-21T20:01:00Z',
      },
    })

    await reportarDispensado(900, null)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/dispensados/900/reporte',
      method: 'PATCH',
      data: { segundos_real: null },
    })
  })
})

describe('createConfigDispensado', () => {
  it("POSTs with snake_case fields — matches the pinned backend's configPinValidator, regression test for SGEB-2001 'field must be defined' on every field", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_config: 5,
        id_evento: 1001,
        id_cubaitor: 1,
        id_insumo: 9,
        pin_gpio: 12,
        caudal_ml_seg: 15.5,
        volumen_cargado_ml: 1000,
        volumen_disponible_ml: 1000,
        ultima_calibracion: '2026-08-21T19:00:00Z',
        activo: true,
      },
    })

    await createConfigDispensado(1001, {
      idCubaitor: 1,
      idInsumo: 9,
      pinGpio: 12,
      caudalMlSeg: 15.5,
      volumenCargadoMl: 1000,
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/config-dispensado',
      method: 'POST',
      data: {
        id_cubaitor: 1,
        id_insumo: 9,
        pin_gpio: 12,
        caudal_ml_seg: 15.5,
        volumen_cargado_ml: 1000,
      },
    })
  })
})

describe('updateConfigDispensado', () => {
  it('PUTs only caudal_ml_seg (snake_case) when the caller supplies only that field', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_config: 5,
        id_evento: 1001,
        id_cubaitor: 1,
        id_insumo: 9,
        pin_gpio: 12,
        caudal_ml_seg: 16,
        volumen_cargado_ml: 1000,
        volumen_disponible_ml: 800,
        ultima_calibracion: '2026-08-21T19:30:00Z',
        activo: true,
      },
    })

    await updateConfigDispensado(1001, 5, { caudalMlSeg: 16 })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/config-dispensado/5',
      method: 'PUT',
      data: { caudal_ml_seg: 16 },
    })
  })

  it('PUTs only pin_gpio (snake_case) when the caller supplies only that field', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_config: 5,
        id_evento: 1001,
        id_cubaitor: 1,
        id_insumo: 9,
        pin_gpio: 14,
        caudal_ml_seg: 15.5,
        volumen_cargado_ml: 1000,
        volumen_disponible_ml: 800,
        ultima_calibracion: '2026-08-21T19:30:00Z',
        activo: true,
      },
    })

    await updateConfigDispensado(1001, 5, { pinGpio: 14 })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/config-dispensado/5',
      method: 'PUT',
      data: { pin_gpio: 14 },
    })
  })

  it('PUTs both fields (snake_case) when the caller supplies both, and omits neither as undefined', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_config: 5,
        id_evento: 1001,
        id_cubaitor: 1,
        id_insumo: 9,
        pin_gpio: 14,
        caudal_ml_seg: 16,
        volumen_cargado_ml: 1000,
        volumen_disponible_ml: 800,
        ultima_calibracion: '2026-08-21T19:30:00Z',
        activo: true,
      },
    })

    await updateConfigDispensado(1001, 5, { caudalMlSeg: 16, pinGpio: 14 })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/config-dispensado/5',
      method: 'PUT',
      data: { caudal_ml_seg: 16, pin_gpio: 14 },
    })
    const call = vi.mocked(requestSgeb).mock.calls[0]?.[0]
    expect(call?.data).not.toHaveProperty('id_insumo')
    expect(call?.data).not.toHaveProperty('volumen_cargado_ml')
  })
})

describe('recargarConfigDispensado', () => {
  it('PATCHes with { volumen_cargado_ml, reanudar_ordenes } — snake_case (recargaValidator), regression test for SGEB-2001, and maps the confirmed BARE ConfigDispensado response — not a nested { config, detalles_reanudados } wrapper. Regression test: the backend recharges successfully and returns the resource directly; assuming a nested wrapper here previously threw a TypeError on `undefined.config` and surfaced as a false "Ocurrió un error inesperado."', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: {
        code: 'SGEB-0000',
        message: 'CONFIG_DISPENSADO id=5 recargada. 3 detalles reanudados.',
      },
      data: {
        id_config: 5,
        id_evento: 1001,
        id_cubaitor: 1,
        id_insumo: 9,
        pin_gpio: 12,
        caudal_ml_seg: 15.5,
        volumen_cargado_ml: 1000,
        volumen_disponible_ml: 1000,
        ultima_calibracion: '2026-08-21T19:00:00Z',
        activo: true,
      },
    })

    const result = await recargarConfigDispensado(1001, 5, 1000)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/config-dispensado/5/recarga',
      method: 'PATCH',
      data: { volumen_cargado_ml: 1000, reanudar_ordenes: true },
    })
    expect(result.idConfig).toBe(5)
    expect(result.volumenDisponibleMl).toBe(1000)
  })

  it('sends an explicit reanudar_ordenes: false when the caller opts out', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_config: 5,
        id_evento: 1001,
        id_cubaitor: 1,
        id_insumo: 9,
        pin_gpio: 12,
        caudal_ml_seg: 15.5,
        volumen_cargado_ml: 1000,
        volumen_disponible_ml: 1000,
        ultima_calibracion: '2026-08-21T19:00:00Z',
        activo: true,
      },
    })

    await recargarConfigDispensado(1001, 5, 1000, false)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/config-dispensado/5/recarga',
      method: 'PATCH',
      data: { volumen_cargado_ml: 1000, reanudar_ordenes: false },
    })
  })
})

describe('fetchAlertasEvento', () => {
  it("maps the confirmed real alertas shape — a bare array (not the {alertas, total, ordenes_pausadas, severidad_maxima} wrapper), entirely different fields from OpenAPI's AlertaOperativa schema", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        {
          tipo: 'botella_vacia',
          codigo: 'SGEB-4009',
          severidad: 'alta',
          id_config: 5,
          pin_gpio: 12,
          id_insumo: 9,
          insumo: 'Ron',
          volumen_disponible_ml: 0,
        },
        {
          tipo: 'cubaitor_sin_conexion',
          codigo: 'SGEB-5003',
          severidad: 'alta',
          id_cubaitor: 1,
          nombre: 'Barra 1',
          segundos_sin_reportar: null,
          nota: 'El evento continúa con dispensado manual (RNF-13).',
        },
      ],
    })

    const result = await fetchAlertasEvento(1001)

    expect(result).toEqual({
      alertas: [
        {
          tipo: 'botella_vacia',
          codigo: 'SGEB-4009',
          severidad: 'alta',
          idConfig: 5,
          pinGpio: 12,
          idInsumo: 9,
          insumo: 'Ron',
          volumenDisponibleMl: 0,
        },
        {
          tipo: 'cubaitor_sin_conexion',
          codigo: 'SGEB-5003',
          severidad: 'alta',
          idCubaitor: 1,
          nombre: 'Barra 1',
          segundosSinReportar: null,
          nota: 'El evento continúa con dispensado manual (RNF-13).',
        },
      ],
      total: 2,
      severidadMaxima: 'alta',
    })
  })

  it('derives total: 0 and severidadMaxima: null from an empty array', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'sin resultados' },
      data: [],
    })

    const result = await fetchAlertasEvento(1001)

    expect(result).toEqual({ alertas: [], total: 0, severidadMaxima: null })
  })
})
