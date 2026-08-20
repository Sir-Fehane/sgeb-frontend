import { describe, expect, it } from 'vitest'

import { createMesaFormSchema } from '@/features/events/schemas/mesaCreateSchema'

describe('createMesaFormSchema', () => {
  it('accepts a valid etiqueta', () => {
    expect(createMesaFormSchema.safeParse({ etiqueta: 'Mesa 1' }).success).toBe(true)
  })

  it('rejects an empty etiqueta', () => {
    expect(createMesaFormSchema.safeParse({ etiqueta: '' }).success).toBe(false)
  })

  it('rejects an etiqueta longer than 20 characters', () => {
    expect(createMesaFormSchema.safeParse({ etiqueta: 'x'.repeat(21) }).success).toBe(
      false,
    )
  })
})
