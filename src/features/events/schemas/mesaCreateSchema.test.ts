import { describe, expect, it } from 'vitest'

import { createMesaFormSchema } from '@/features/events/schemas/mesaCreateSchema'

describe('createMesaFormSchema', () => {
  it('accepts an etiqueta with an empty (not provided) nfc_uid', () => {
    expect(
      createMesaFormSchema.safeParse({ etiqueta: 'Mesa 1', nfc_uid: '' }).success,
    ).toBe(true)
  })

  it('rejects an empty etiqueta', () => {
    expect(createMesaFormSchema.safeParse({ etiqueta: '', nfc_uid: '' }).success).toBe(
      false,
    )
  })

  it('rejects an etiqueta longer than 20 characters', () => {
    expect(
      createMesaFormSchema.safeParse({ etiqueta: 'x'.repeat(21), nfc_uid: '' }).success,
    ).toBe(false)
  })

  it('accepts a well-formed hex nfc_uid', () => {
    expect(
      createMesaFormSchema.safeParse({ etiqueta: 'Mesa 1', nfc_uid: 'AB:CD:12:34' })
        .success,
    ).toBe(true)
  })

  it('rejects a malformed nfc_uid', () => {
    expect(
      createMesaFormSchema.safeParse({ etiqueta: 'Mesa 1', nfc_uid: 'not-hex!' }).success,
    ).toBe(false)
  })
})
