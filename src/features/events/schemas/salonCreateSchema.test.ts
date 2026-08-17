import { describe, expect, it } from 'vitest'

import { createSalonFormSchema } from '@/features/events/schemas/salonCreateSchema'

const VALID = {
  nombre: 'Salón Nuevo',
  calle: 'Av. Reforma 100',
  cp: '06600',
  colonia: 'Juárez',
  ciudad: 'CDMX',
  estado: 'CDMX',
  latitud: 19.42,
  longitud: -99.16,
  capacidadMaxMesas: 30,
  capacidadPersonas: 150,
}

describe('createSalonFormSchema', () => {
  it('accepts a fully valid set of values', () => {
    expect(createSalonFormSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects a malformed código postal', () => {
    expect(createSalonFormSchema.safeParse({ ...VALID, cp: '123' }).success).toBe(false)
  })

  it('rejects a latitud out of range', () => {
    expect(createSalonFormSchema.safeParse({ ...VALID, latitud: 91 }).success).toBe(false)
  })

  it('rejects a longitud out of range', () => {
    expect(createSalonFormSchema.safeParse({ ...VALID, longitud: -181 }).success).toBe(
      false,
    )
  })

  it('rejects capacidadMaxMesas above 255', () => {
    expect(
      createSalonFormSchema.safeParse({ ...VALID, capacidadMaxMesas: 256 }).success,
    ).toBe(false)
  })

  it('rejects a nombre shorter than 3 characters', () => {
    expect(createSalonFormSchema.safeParse({ ...VALID, nombre: 'ab' }).success).toBe(
      false,
    )
  })
})
