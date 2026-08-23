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
  it("POSTs /cubaitors with snake_case `num_pins`/`host_ip` — matches the pinned backend's cubaitorValidator and OpenAPI, regression test for SGEB-2001 'the num_pins field must be defined'", async () => {
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
      data: { nombre: 'Barra 1', mac: 'aa:bb:cc:dd:ee:ff', num_pins: 8 },
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

  it('sends host_ip (snake_case) when provided', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_cubaitor: 1,
        nombre: 'Barra 1',
        mac: 'AA:BB:CC:DD:EE:FF',
        host_ip: '192.168.1.20',
        num_pins: 8,
        estado: 'activo',
        ultima_conexion: null,
      },
    })

    await createCubaitor({
      nombre: 'Barra 1',
      mac: 'aa:bb:cc:dd:ee:ff',
      numPins: 8,
      hostIp: '192.168.1.20',
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/cubaitors',
      method: 'POST',
      data: {
        nombre: 'Barra 1',
        mac: 'aa:bb:cc:dd:ee:ff',
        num_pins: 8,
        host_ip: '192.168.1.20',
      },
    })
  })

  it('omits host_ip from the request body entirely when not provided, rather than sending undefined', async () => {
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
    expect(call?.data).not.toHaveProperty('host_ip')
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

  it('PUTs num_pins (snake_case) — regression test for SGEB-2001 on update', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_cubaitor: 1,
        nombre: 'Barra 1',
        mac: 'AA:BB:CC:DD:EE:FF',
        host_ip: null,
        num_pins: 4,
        estado: 'activo',
        ultima_conexion: null,
      },
    })

    await updateCubaitor(1, { numPins: 4 })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/cubaitors/1',
      method: 'PUT',
      data: { num_pins: 4 },
    })
  })

  it('PUTs host_ip (snake_case), including an explicit null to clear it', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
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

    await updateCubaitor(1, { hostIp: null })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/cubaitors/1',
      method: 'PUT',
      data: { host_ip: null },
    })
  })

  it('combines nombre, num_pins, host_ip and estado in one snake_case body when all are provided', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_cubaitor: 1,
        nombre: 'Barra renombrada',
        mac: 'AA:BB:CC:DD:EE:FF',
        host_ip: '192.168.1.20',
        num_pins: 4,
        estado: 'mantenimiento',
        ultima_conexion: null,
      },
    })

    await updateCubaitor(1, {
      nombre: 'Barra renombrada',
      numPins: 4,
      hostIp: '192.168.1.20',
      estado: 'mantenimiento',
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/cubaitors/1',
      method: 'PUT',
      data: {
        nombre: 'Barra renombrada',
        num_pins: 4,
        host_ip: '192.168.1.20',
        estado: 'mantenimiento',
      },
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
