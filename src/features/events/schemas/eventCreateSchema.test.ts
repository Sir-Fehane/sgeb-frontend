import { afterEach, describe, expect, it, vi } from 'vitest'

import { createEventFormSchema } from '@/features/events/schemas/eventCreateSchema'
import type { EventSalonOption } from '@/features/events/types/event'

const SALONES: EventSalonOption[] = [
  {
    idSalon: 1,
    nombre: 'Salón Roble',
    capacidadMaxMesas: 40,
    latitud: 25.5428,
    longitud: -103.4068,
  },
]

function validValues() {
  return {
    id_salon: 1,
    titulo: 'Evento válido',
    tipo: 'social' as const,
    fecha: '2099-01-10',
    hora_presentacion: '16:00',
    hora_inicio: '18:00',
    cupo_meseros: 5,
    num_mesas: 10,
    tarifa_por_mesero: 400,
    radio_geocerca_m: 150,
  }
}

describe('createEventFormSchema', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts a fully valid set of values, with hora_inicio as a bare HH:MM time — not a datetime', () => {
    const schema = createEventFormSchema(SALONES)
    const result = schema.safeParse(validValues())

    expect(result.success).toBe(true)
    expect(result.success && result.data.hora_inicio).toBe('18:00')
  })

  it('has no `inicio` field at all — inicio is derived by the caller (buildInicioDateTime), never a schema field', () => {
    const schema = createEventFormSchema(SALONES)
    const result = schema.safeParse(validValues())

    expect(result.success && result.data).not.toHaveProperty('inicio')
  })

  it('rejects a malformed hora_inicio', () => {
    const schema = createEventFormSchema(SALONES)
    const result = schema.safeParse({ ...validValues(), hora_inicio: '25:99' })

    expect(result.success).toBe(false)
  })

  it('rejects fecha + hora_inicio combinations that are already in the past, on the hora_inicio field', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-10T12:00:00'))

    const schema = createEventFormSchema(SALONES)
    const result = schema.safeParse({
      ...validValues(),
      fecha: '2099-01-10',
      hora_inicio: '08:00',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (current) => current.path[0] === 'hora_inicio',
      )
      expect(issue?.message).toMatch(/no puede ser anterior a este momento/)
    }
  })

  it('accepts fecha + hora_inicio combinations still in the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-10T12:00:00'))

    const schema = createEventFormSchema(SALONES)
    const result = schema.safeParse({
      ...validValues(),
      fecha: '2099-01-10',
      hora_inicio: '18:00',
    })

    expect(result.success).toBe(true)
  })

  it('still enforces SGEB-4007 — num_mesas must not exceed the selected salón capacity', () => {
    const schema = createEventFormSchema(SALONES)
    const result = schema.safeParse({ ...validValues(), num_mesas: 41 })

    expect(result.success).toBe(false)
  })

  it('never introduces a horaPresentacion-vs-hora_inicio ordering rule — hora_presentacion after hora_inicio is still accepted', () => {
    const schema = createEventFormSchema(SALONES)
    const result = schema.safeParse({
      ...validValues(),
      hora_presentacion: '20:00',
      hora_inicio: '18:00',
    })

    expect(result.success).toBe(true)
  })

  describe('radio_geocerca_m boundaries (10-1000 m inclusive)', () => {
    it('rejects 9 — one below the documented minimum', () => {
      const schema = createEventFormSchema(SALONES)
      expect(schema.safeParse({ ...validValues(), radio_geocerca_m: 9 }).success).toBe(
        false,
      )
    })

    it('accepts 10 — the documented minimum, inclusive', () => {
      const schema = createEventFormSchema(SALONES)
      expect(schema.safeParse({ ...validValues(), radio_geocerca_m: 10 }).success).toBe(
        true,
      )
    })

    it('accepts 1000 — the documented maximum, inclusive', () => {
      const schema = createEventFormSchema(SALONES)
      expect(schema.safeParse({ ...validValues(), radio_geocerca_m: 1000 }).success).toBe(
        true,
      )
    })

    it('rejects 1001 — one above the documented maximum', () => {
      const schema = createEventFormSchema(SALONES)
      expect(schema.safeParse({ ...validValues(), radio_geocerca_m: 1001 }).success).toBe(
        false,
      )
    })
  })
})
