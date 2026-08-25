import { describe, expect, it } from 'vitest'

import {
  createCubaitorSchema,
  updateCubaitorSchema,
} from '@/features/cubaitor/schemas/cubaitorSchemas'

const VALID_CREATE = {
  nombre: 'Barra 1',
  mac: 'A4:CF:12:9B:3E:01',
  numPins: 4,
  hostIp: null,
}

describe('createCubaitorSchema', () => {
  it('accepts a nombre of exactly 40 characters — the pinned backend maximum', () => {
    expect(
      createCubaitorSchema.safeParse({ ...VALID_CREATE, nombre: 'x'.repeat(40) }).success,
    ).toBe(true)
  })

  it('rejects a nombre longer than 40 characters — regression test for the SGEB-2001 length mismatch (form used to allow 50)', () => {
    expect(
      createCubaitorSchema.safeParse({ ...VALID_CREATE, nombre: 'x'.repeat(41) }).success,
    ).toBe(false)
  })
})

describe('updateCubaitorSchema', () => {
  it('rejects a nombre longer than 40 characters', () => {
    expect(updateCubaitorSchema.safeParse({ nombre: 'x'.repeat(41) }).success).toBe(false)
  })

  it('accepts a nombre of exactly 40 characters', () => {
    expect(updateCubaitorSchema.safeParse({ nombre: 'x'.repeat(40) }).success).toBe(true)
  })
})
