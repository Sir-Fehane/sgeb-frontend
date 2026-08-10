import { describe, expect, it } from 'vitest'

import {
  createWasteReportSchema,
  WASTE_TYPES,
} from '@/features/events/closure/schemas/wasteReportSchema'

function validDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    tipo: 'vaso_roto',
    descripcion: null,
    cantidad: 1,
    costo_estimado: null,
    ...overrides,
  }
}

function validPayload(detalles: unknown[] = [validDetail()]) {
  return { observaciones: null, detalles }
}

describe('createWasteReportSchema — categories', () => {
  it('accepts all five documented waste categories', () => {
    for (const tipo of WASTE_TYPES) {
      const result = createWasteReportSchema.safeParse(
        validPayload([validDetail({ tipo })]),
      )
      expect(result.success).toBe(true)
    }
  })

  it('rejects an undocumented category', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ tipo: 'silla_rota' })]),
    )
    expect(result.success).toBe(false)
  })
})

describe('createWasteReportSchema — detalles array', () => {
  it('requires at least one detail', () => {
    const result = createWasteReportSchema.safeParse(validPayload([]))
    expect(result.success).toBe(false)
  })

  it('accepts multiple details', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail(), validDetail({ tipo: 'plato_roto' })]),
    )
    expect(result.success).toBe(true)
  })
})

describe('createWasteReportSchema — cantidad', () => {
  it('is required', () => {
    const detail = validDetail()
    delete (detail as Record<string, unknown>).cantidad
    const result = createWasteReportSchema.safeParse(validPayload([detail]))
    expect(result.success).toBe(false)
  })

  it('rejects cantidad below 1', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ cantidad: 0 })]),
    )
    expect(result.success).toBe(false)
  })

  it('accepts cantidad at the minimum boundary (1)', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ cantidad: 1 })]),
    )
    expect(result.success).toBe(true)
  })

  it('accepts cantidad at the maximum boundary (65535)', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ cantidad: 65535 })]),
    )
    expect(result.success).toBe(true)
  })

  it('rejects cantidad above 65535', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ cantidad: 65536 })]),
    )
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer cantidad', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ cantidad: 1.5 })]),
    )
    expect(result.success).toBe(false)
  })
})

describe('createWasteReportSchema — descripcion', () => {
  it('is optional — null is accepted', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ descripcion: null })]),
    )
    expect(result.success).toBe(true)
  })

  it('accepts a description at exactly 150 characters', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ descripcion: 'a'.repeat(150) })]),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a description over 150 characters', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ descripcion: 'a'.repeat(151) })]),
    )
    expect(result.success).toBe(false)
  })
})

describe('createWasteReportSchema — costo_estimado', () => {
  it('is optional — null is accepted', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ costo_estimado: null })]),
    )
    expect(result.success).toBe(true)
  })

  it('accepts 0', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ costo_estimado: 0 })]),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a negative value', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ costo_estimado: -1 })]),
    )
    expect(result.success).toBe(false)
  })

  it('accepts the documented maximum (999999.99)', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ costo_estimado: 999999.99 })]),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a value above the documented maximum', () => {
    const result = createWasteReportSchema.safeParse(
      validPayload([validDetail({ costo_estimado: 1000000 })]),
    )
    expect(result.success).toBe(false)
  })
})

describe('createWasteReportSchema — observaciones', () => {
  it('is optional — null is accepted', () => {
    const result = createWasteReportSchema.safeParse({
      observaciones: null,
      detalles: [validDetail()],
    })
    expect(result.success).toBe(true)
  })

  it('accepts observaciones at exactly 255 characters', () => {
    const result = createWasteReportSchema.safeParse({
      observaciones: 'a'.repeat(255),
      detalles: [validDetail()],
    })
    expect(result.success).toBe(true)
  })

  it('rejects observaciones over 255 characters', () => {
    const result = createWasteReportSchema.safeParse({
      observaciones: 'a'.repeat(256),
      detalles: [validDetail()],
    })
    expect(result.success).toBe(false)
  })
})
