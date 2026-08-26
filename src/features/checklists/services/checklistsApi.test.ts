import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createChecklist,
  deactivateChecklist,
  fetchChecklists,
  updateChecklist,
} from '@/features/checklists/services/checklistsApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const MONTAJE_RECORD = {
  id_checklist: 1,
  nombre: 'Montaje de salón',
  tipo: 'montaje' as const,
  activo: true,
  items: [
    {
      id_item: 10,
      id_checklist: 1,
      descripcion: 'Colocar mantelería',
      cantidad_esperada: 20,
      orden: 1,
      activo: true,
    },
    {
      id_item: 11,
      id_checklist: 1,
      descripcion: 'Acomodar sillas',
      cantidad_esperada: 10,
      orden: 2,
      activo: false,
    },
  ],
}

describe('fetchChecklists', () => {
  it("GETs /checklists with the optional tipo/activo filters and maps the response — which comes back snake_case (cantidad_esperada), per ChecklistItem's serializeAs on the pinned backend", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [MONTAJE_RECORD],
    })

    const result = await fetchChecklists({ tipo: 'montaje', activo: true })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/checklists',
      params: { tipo: 'montaje', activo: true },
    })
    expect(result).toEqual([
      {
        idChecklist: 1,
        nombre: 'Montaje de salón',
        tipo: 'montaje',
        activo: true,
        items: [
          {
            idItem: 10,
            descripcion: 'Colocar mantelería',
            cantidadEsperada: 20,
            orden: 1,
            activo: true,
          },
          {
            idItem: 11,
            descripcion: 'Acomodar sillas',
            cantidadEsperada: 10,
            orden: 2,
            activo: false,
          },
        ],
      },
    ])
  })

  it('sends no params when none are given', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [],
    })

    await fetchChecklists()

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/checklists', params: {} })
  })
})

/**
 * Regression coverage for the real, reproduced bug: this service used to
 * send each item's expected-quantity field as snake_case
 * `cantidad_esperada`, but `checklist_validator.ts` on the pinned backend
 * validates the raw JSON key `cantidadEsperada` (camelCase) — there is no
 * case-conversion middleware anywhere in the backend. A missing
 * `cantidadEsperada` key fails VineJS's `required` rule, which the global
 * exception handler (`app/exceptions/handler.ts`'s `codigoDeValidacion`)
 * maps to `SGEB-2001` ("Faltan datos obligatorios. Completa los campos
 * marcados.") — exactly the error this bug produced end to end. Every case
 * below asserts the exact wire body sent to `requestSgeb`, not just that a
 * request happened, so a regression here fails loudly.
 */
describe('createChecklist — request wire payload (regression: SGEB-2001 from cantidad_esperada vs cantidadEsperada)', () => {
  it('sends a minimal single-item checklist with camelCase cantidadEsperada, never cantidad_esperada', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: MONTAJE_RECORD,
    })

    await createChecklist({
      nombre: 'Montaje de salón',
      tipo: 'montaje',
      items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
    })

    const [config] = vi.mocked(requestSgeb).mock.calls[0]!
    expect(config).toEqual({
      url: '/checklists',
      method: 'POST',
      data: {
        nombre: 'Montaje de salón',
        tipo: 'montaje',
        items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
      },
    })
    // Belt-and-suspenders: explicitly prove the buggy key is absent, not
    // merely that the correct key is present alongside it.
    const sentItem = (config.data as { items: Record<string, unknown>[] }).items[0]!
    expect(sentItem).not.toHaveProperty('cantidad_esperada')
    expect(sentItem).toHaveProperty('cantidadEsperada', 20)
  })

  it('sends every item with camelCase cantidadEsperada for a multi-item checklist', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: MONTAJE_RECORD,
    })

    await createChecklist({
      nombre: 'Montaje de salón',
      tipo: 'montaje',
      items: [
        { descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 },
        { descripcion: 'Acomodar sillas', cantidadEsperada: 10, orden: 2 },
        { descripcion: 'Encender velas', cantidadEsperada: 5, orden: 3 },
      ],
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/checklists',
      method: 'POST',
      data: {
        nombre: 'Montaje de salón',
        tipo: 'montaje',
        items: [
          { descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 },
          { descripcion: 'Acomodar sillas', cantidadEsperada: 10, orden: 2 },
          { descripcion: 'Encender velas', cantidadEsperada: 5, orden: 3 },
        ],
      },
    })
  })

  it.each(['montaje', 'servicio', 'cierre'] as const)(
    'sends tipo=%s through unchanged — no per-type request shape difference',
    async (tipo) => {
      vi.mocked(requestSgeb).mockResolvedValue({
        result: { code: 'SGEB-0001', message: 'creado' },
        data: { ...MONTAJE_RECORD, tipo },
      })

      await createChecklist({
        nombre: 'Plantilla de prueba',
        tipo,
        items: [{ descripcion: 'Ítem único', cantidadEsperada: 1, orden: 1 }],
      })

      const [config] = vi.mocked(requestSgeb).mock.calls[0]!
      const sentData = config.data as { tipo: string }
      expect(sentData.tipo).toBe(tipo)
    },
  )

  it('never includes id_item or activo on request items — those are response-only fields', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: MONTAJE_RECORD,
    })

    await createChecklist({
      nombre: 'Montaje de salón',
      tipo: 'montaje',
      items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
    })

    const [config] = vi.mocked(requestSgeb).mock.calls[0]!
    const sentItem = (config.data as { items: Record<string, unknown>[] }).items[0]!
    expect(sentItem).not.toHaveProperty('id_item')
    expect(sentItem).not.toHaveProperty('activo')
    expect(Object.keys(sentItem).sort()).toEqual([
      'cantidadEsperada',
      'descripcion',
      'orden',
    ])
  })

  it('maps the response back with the real ChecklistTemplateViewModel result', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: MONTAJE_RECORD,
    })

    const result = await createChecklist({
      nombre: 'Montaje de salón',
      tipo: 'montaje',
      items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
    })

    expect(result.idChecklist).toBe(1)
    expect(result.items).toHaveLength(2)
  })
})

describe('updateChecklist — request wire payload', () => {
  it('PUTs /checklists/{id} with camelCase cantidadEsperada, same as create', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: MONTAJE_RECORD,
    })

    await updateChecklist(1, {
      nombre: 'Montaje de salón',
      tipo: 'montaje',
      items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/checklists/1',
      method: 'PUT',
      data: {
        nombre: 'Montaje de salón',
        tipo: 'montaje',
        items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
      },
    })
  })
})

describe('deactivateChecklist', () => {
  it('DELETEs /checklists/{id}', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await deactivateChecklist(1)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/checklists/1', method: 'DELETE' })
  })
})
