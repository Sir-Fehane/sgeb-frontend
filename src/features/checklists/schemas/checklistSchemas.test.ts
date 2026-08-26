import { describe, expect, it } from 'vitest'

import {
  CHECKLIST_TIPOS,
  createChecklistSchema,
} from '@/features/checklists/schemas/checklistSchemas'

const VALID_MINIMAL = {
  nombre: 'Montaje de salón',
  tipo: 'montaje' as const,
  items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 }],
}

describe('createChecklistSchema', () => {
  it('accepts a minimal valid checklist (one item)', () => {
    const result = createChecklistSchema.safeParse(VALID_MINIMAL)

    expect(result.success).toBe(true)
  })

  it('accepts a checklist with multiple items', () => {
    const result = createChecklistSchema.safeParse({
      ...VALID_MINIMAL,
      items: [
        { descripcion: 'Colocar mantelería', cantidadEsperada: 20, orden: 1 },
        { descripcion: 'Acomodar sillas', cantidadEsperada: 10, orden: 2 },
        { descripcion: 'Encender velas', cantidadEsperada: 5, orden: 3 },
      ],
    })

    expect(result.success).toBe(true)
  })

  it.each(CHECKLIST_TIPOS)('accepts tipo=%s as a valid template type', (tipo) => {
    const result = createChecklistSchema.safeParse({ ...VALID_MINIMAL, tipo })

    expect(result.success).toBe(true)
  })

  it('rejects a checklist missing nombre', () => {
    const { nombre: _nombre, ...withoutNombre } = VALID_MINIMAL
    const result = createChecklistSchema.safeParse(withoutNombre)

    expect(result.success).toBe(false)
  })

  it('rejects a checklist missing tipo', () => {
    const { tipo: _tipo, ...withoutTipo } = VALID_MINIMAL
    const result = createChecklistSchema.safeParse(withoutTipo)

    expect(result.success).toBe(false)
  })

  it('rejects an empty items array', () => {
    const result = createChecklistSchema.safeParse({ ...VALID_MINIMAL, items: [] })

    expect(result.success).toBe(false)
  })

  it('rejects an item missing descripcion', () => {
    const result = createChecklistSchema.safeParse({
      ...VALID_MINIMAL,
      items: [{ cantidadEsperada: 20, orden: 1 }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects an item missing cantidadEsperada', () => {
    const result = createChecklistSchema.safeParse({
      ...VALID_MINIMAL,
      items: [{ descripcion: 'Colocar mantelería', orden: 1 }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects an item missing orden', () => {
    const result = createChecklistSchema.safeParse({
      ...VALID_MINIMAL,
      items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 20 }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects an unrecognized tipo value', () => {
    const result = createChecklistSchema.safeParse({ ...VALID_MINIMAL, tipo: 'limpieza' })

    expect(result.success).toBe(false)
  })
})
