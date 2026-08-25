import { describe, expect, it } from 'vitest'

import { datosBancariosSchema } from '@/features/account/schemas/datosBancariosSchema'

const VALID = {
  clabe: '012345678901234567',
  banco: 'BBVA',
  titularCuenta: 'Ana Torres',
}

describe('datosBancariosSchema', () => {
  it('accepts a valid 18-digit clabe', () => {
    expect(datosBancariosSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects a clabe shorter than 18 digits', () => {
    expect(
      datosBancariosSchema.safeParse({ ...VALID, clabe: '01234567890123456' }).success,
    ).toBe(false)
  })

  it('rejects a clabe longer than 18 digits', () => {
    expect(
      datosBancariosSchema.safeParse({ ...VALID, clabe: '0123456789012345678' }).success,
    ).toBe(false)
  })

  it('rejects a non-numeric clabe', () => {
    expect(
      datosBancariosSchema.safeParse({ ...VALID, clabe: '01234567890123456X' }).success,
    ).toBe(false)
  })

  it('rejects a banco shorter than 2 characters', () => {
    expect(datosBancariosSchema.safeParse({ ...VALID, banco: 'B' }).success).toBe(false)
  })

  it('rejects a titularCuenta shorter than 3 characters', () => {
    expect(
      datosBancariosSchema.safeParse({ ...VALID, titularCuenta: 'An' }).success,
    ).toBe(false)
  })
})
