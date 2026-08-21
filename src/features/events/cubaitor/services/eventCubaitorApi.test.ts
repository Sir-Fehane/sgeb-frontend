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
        },
      ],
    })
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
  it('maps the CONFIRMED real (mixed-casing) response shape — NOT a Dispensado, contra OpenAPI', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_detalle: 1,
        idEvento: 1001,
        idOrden: 501,
        idMesa: 7,
        estadoOrden: 'en_preparacion',
        instrucciones: [
          { id_dispensado: 900, pin_gpio: 12, volumen_ml: 45, segundos: 2.9 },
          { id_dispensado: 901, pin_gpio: 13, volumen_ml: 250, segundos: 10 },
        ],
      },
    })

    const result = await dispensarDetalle(1)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/orden-detalles/1/dispensar',
      method: 'POST',
    })
    expect(result).toEqual({
      idDetalle: 1,
      idEvento: 1001,
      idOrden: 501,
      idMesa: 7,
      estadoOrden: 'en_preparacion',
      instrucciones: [
        { idDispensado: 900, pinGpio: 12, volumenMl: 45, segundos: 2.9 },
        { idDispensado: 901, pinGpio: 13, volumenMl: 250, segundos: 10 },
      ],
    })
  })
})

describe('reportarDispensado', () => {
  it('PATCHes /dispensados/{id}/reporte with exactly { segundosReal } — camelCase, and never sends `estado` (always server-computed)', async () => {
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
      data: { segundosReal: 2.9 },
    })
  })

  it('supports a null segundosReal (device-timeout fallback)', async () => {
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
      data: { segundosReal: null },
    })
  })
})

describe('createConfigDispensado', () => {
  it("POSTs with camelCase fields — confirmed against the pinned backend's configPinValidator", async () => {
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
        idCubaitor: 1,
        idInsumo: 9,
        pinGpio: 12,
        caudalMlSeg: 15.5,
        volumenCargadoMl: 1000,
      },
    })
  })
})

describe('updateConfigDispensado', () => {
  it('sends only caudalMlSeg/pinGpio — the pinned backend does not accept idInsumo/volumenCargadoMl here despite OpenAPI', async () => {
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
      data: { caudalMlSeg: 16 },
    })
  })
})

describe('recargarConfigDispensado', () => {
  it('maps the confirmed nested { config, detalles_reanudados } wrapper — not a bare ConfigDispensado', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        config: {
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
        detalles_reanudados: 3,
      },
    })

    const result = await recargarConfigDispensado(1001, 5, 1000)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/config-dispensado/5/recarga',
      method: 'PATCH',
      data: { volumenCargadoMl: 1000, reanudarOrdenes: true },
    })
    expect(result.detallesReanudados).toBe(3)
    expect(result.config.idConfig).toBe(5)
  })
})

describe('fetchAlertasEvento', () => {
  it("maps the confirmed real alertas shape — entirely different from OpenAPI's AlertaOperativa schema", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        alertas: [
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
        total: 2,
        ordenes_pausadas: 1,
        severidad_maxima: 'alta',
      },
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
      ordenesPausadas: 1,
      severidadMaxima: 'alta',
    })
  })
})
