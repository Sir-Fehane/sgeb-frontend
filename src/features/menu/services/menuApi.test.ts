import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createBebida,
  createEnvase,
  createInsumo,
  definirReceta,
  fetchBebidas,
  fetchInsumos,
  updateInsumoEstado,
} from '@/features/menu/services/menuApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

describe('createInsumo', () => {
  it('POSTs /insumos with the exact request body (single-word fields, casing-neutral)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_insumo: 1,
        nombre: 'Ron',
        tipo: 'alcohol',
        unidad: 'ml',
        costo: 250,
        estado: 'disponible',
        activo: true,
      },
    })

    const result = await createInsumo({
      nombre: 'Ron',
      tipo: 'alcohol',
      unidad: 'ml',
      costo: 250,
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/insumos',
      method: 'POST',
      data: { nombre: 'Ron', tipo: 'alcohol', unidad: 'ml', costo: 250 },
    })
    expect(result).toEqual({
      idInsumo: 1,
      nombre: 'Ron',
      tipo: 'alcohol',
      unidad: 'ml',
      costo: 250,
      estado: 'disponible',
      activo: true,
    })
  })
})

describe('updateInsumoEstado', () => {
  it('PATCHes /insumos/{id}/estado and maps the confirmed nested { insumo, ordenes_pausadas } wrapper — not a bare Insumo', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        insumo: {
          id_insumo: 1,
          nombre: 'Ron',
          tipo: 'alcohol',
          unidad: 'ml',
          costo: 250,
          estado: 'agotado',
          activo: true,
        },
        ordenes_pausadas: 3,
      },
    })

    const result = await updateInsumoEstado(1, 'agotado')

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/insumos/1/estado',
      method: 'PATCH',
      data: { estado: 'agotado' },
    })
    expect(result.ordenesPausadas).toBe(3)
    expect(result.insumo.estado).toBe('agotado')
  })
})

describe('fetchInsumos', () => {
  it('sends no `tipo` query param (the pinned backend does not implement that filter, despite OpenAPI documenting it)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [],
    })

    await fetchInsumos({ estado: 'disponible' })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/insumos',
      params: { estado: 'disponible' },
    })
  })
})

describe('createEnvase', () => {
  it("POSTs /envases with camelCase `volumenMl` — confirmed against the pinned backend, not OpenAPI's documented `volumen_ml`", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: { id_envase: 5, nombre: 'Vaso Normal', volumen_ml: 350, activo: true },
    })

    await createEnvase({ nombre: 'Vaso Normal', volumenMl: 350 })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/envases',
      method: 'POST',
      data: { nombre: 'Vaso Normal', volumenMl: 350 },
    })
  })
})

describe('createBebida', () => {
  it('defaults an omitted descripcion to null rather than undefined', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: {
        id_bebida: 9,
        nombre: 'Cuba Libre',
        descripcion: null,
        alcoholica: true,
        activo: true,
      },
    })

    await createBebida({ nombre: 'Cuba Libre', alcoholica: true })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/bebidas',
      method: 'POST',
      data: { nombre: 'Cuba Libre', descripcion: null, alcoholica: true },
    })
  })
})

describe('definirReceta', () => {
  it('PUTs /bebidas/{id}/receta with camelCase ingredient fields, and maps the full Bebida response', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_bebida: 9,
        nombre: 'Cuba Libre',
        descripcion: null,
        alcoholica: true,
        activo: true,
        receta: [
          {
            id_receta_ing: 1,
            id_bebida: 9,
            id_insumo: 1,
            tipo_porcion: 'FIJO_ML',
            valor: 45,
            orden_servido: 1,
          },
        ],
      },
    })

    const result = await definirReceta(9, [
      { idInsumo: 1, tipoPorcion: 'FIJO_ML', valor: 45, ordenServido: 1 },
    ])

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/bebidas/9/receta',
      method: 'PUT',
      data: {
        ingredientes: [
          { idInsumo: 1, tipoPorcion: 'FIJO_ML', valor: 45, ordenServido: 1 },
        ],
      },
    })
    expect(result.receta).toEqual([
      {
        idRecetaIng: 1,
        idBebida: 9,
        idInsumo: 1,
        tipoPorcion: 'FIJO_ML',
        valor: 45,
        ordenServido: 1,
      },
    ])
  })
})

describe('fetchBebidas', () => {
  it('maps a bebida with no receta field to an empty array, never undefined', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        {
          id_bebida: 1,
          nombre: 'Agua',
          descripcion: null,
          alcoholica: false,
          activo: true,
        },
      ],
    })

    const result = await fetchBebidas()

    expect(result[0]?.receta).toEqual([])
  })
})
