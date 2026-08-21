import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createCubaitor,
  fetchCubaitorEstado,
  updateCubaitor,
} from '@/features/cubaitor/services/cubaitorApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

describe('createCubaitor', () => {
  it("POSTs /cubaitors with camelCase `numPins`/`hostIp` — confirmed against the pinned backend, not OpenAPI's documented snake_case", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_cubaitor: 1,
        nombre: 'Barra 1',
        mac: 'AA:BB:CC:DD:EE:FF',
        host_ip: null,
        num_pins: 8,
        estado: 'activo',
        ultima_conexion: null,
      },
    })

    const result = await createCubaitor({
      nombre: 'Barra 1',
      mac: 'aa:bb:cc:dd:ee:ff',
      numPins: 8,
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/cubaitors',
      method: 'POST',
      data: { nombre: 'Barra 1', mac: 'aa:bb:cc:dd:ee:ff', numPins: 8 },
    })
    expect(result).toEqual({
      idCubaitor: 1,
      nombre: 'Barra 1',
      mac: 'AA:BB:CC:DD:EE:FF',
      hostIp: null,
      numPins: 8,
      estado: 'activo',
      ultimaConexion: null,
    })
  })

  it('omits hostIp from the request body entirely when not provided, rather than sending undefined', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_cubaitor: 1,
        nombre: 'Barra 1',
        mac: 'AA:BB:CC:DD:EE:FF',
        host_ip: null,
        num_pins: 8,
        estado: 'activo',
        ultima_conexion: null,
      },
    })

    await createCubaitor({ nombre: 'Barra 1', mac: 'aa:bb:cc:dd:ee:ff', numPins: 8 })

    const call = vi.mocked(requestSgeb).mock.calls[0]?.[0]
    expect(call?.data).not.toHaveProperty('hostIp')
  })
})

describe('updateCubaitor', () => {
  it('never sends `mac` — it is immutable server-side (identity key)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_cubaitor: 1,
        nombre: 'Barra renombrada',
        mac: 'AA:BB:CC:DD:EE:FF',
        host_ip: null,
        num_pins: 8,
        estado: 'activo',
        ultima_conexion: null,
      },
    })

    await updateCubaitor(1, { nombre: 'Barra renombrada' })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/cubaitors/1',
      method: 'PUT',
      data: { nombre: 'Barra renombrada' },
    })
  })
})

describe('fetchCubaitorEstado', () => {
  it("maps `en_linea` as reported, without embellishment — trustworthiness is the UI layer's concern, not this mapper's", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-5003', message: 'fuera de línea' },
      data: {
        id_cubaitor: 1,
        nombre: 'Barra 1',
        mac: 'AA:BB:CC:DD:EE:FF',
        en_linea: false,
        ultima_conexion: null,
        segundos_sin_reportar: null,
        pines_configurados: 2,
      },
    })

    const result = await fetchCubaitorEstado(1)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/cubaitors/1/estado' })
    expect(result).toEqual({
      idCubaitor: 1,
      nombre: 'Barra 1',
      mac: 'AA:BB:CC:DD:EE:FF',
      enLinea: false,
      ultimaConexion: null,
      segundosSinReportar: null,
      pinesConfigurados: 2,
    })
  })
})
