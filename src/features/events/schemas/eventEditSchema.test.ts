import { describe, expect, it } from 'vitest'

import { editEventFormSchema } from '@/features/events/schemas/eventEditSchema'

const VALID = {
  titulo: 'Evento válido',
  tipo: 'social' as const,
  cupo_meseros: 5,
  num_mesas: 10,
  tarifa_por_mesero: 400,
  radio_geocerca_m: 150,
}

describe('editEventFormSchema', () => {
  it('accepts a fully valid set of values', () => {
    expect(editEventFormSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects a título shorter than 3 characters', () => {
    const result = editEventFormSchema.safeParse({ ...VALID, titulo: 'ab' })
    expect(result.success).toBe(false)
  })

  it('rejects num_mesas above 255', () => {
    const result = editEventFormSchema.safeParse({ ...VALID, num_mesas: 256 })
    expect(result.success).toBe(false)
  })

  it('rejects a tarifa with more than 2 decimals', () => {
    const result = editEventFormSchema.safeParse({ ...VALID, tarifa_por_mesero: 400.123 })
    expect(result.success).toBe(false)
  })

  it('rejects radio_geocerca_m outside 10-1000', () => {
    expect(editEventFormSchema.safeParse({ ...VALID, radio_geocerca_m: 5 }).success).toBe(
      false,
    )
    expect(
      editEventFormSchema.safeParse({ ...VALID, radio_geocerca_m: 1001 }).success,
    ).toBe(false)
  })

  it('has no id_salon, fecha, hora_presentacion, or inicio fields', () => {
    const result = editEventFormSchema.safeParse(VALID)
    expect(result.success && result.data).not.toHaveProperty('id_salon')
    expect(result.success && result.data).not.toHaveProperty('fecha')
    expect(result.success && result.data).not.toHaveProperty('inicio')
  })
})
