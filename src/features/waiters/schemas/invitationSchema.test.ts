import { describe, expect, it } from 'vitest'

import { invitationFormSchema } from '@/features/waiters/schemas/invitationSchema'

const VALID = {
  nombre: 'Pedro',
  apellidoPaterno: 'Gómez',
  correo: 'pedro.gomez@example.com',
}

describe('invitationFormSchema', () => {
  it('accepts a valid submission with an optional apellidoMaterno omitted', () => {
    expect(invitationFormSchema.safeParse(VALID).success).toBe(true)
  })

  it('accepts a valid submission with apellidoMaterno present', () => {
    expect(
      invitationFormSchema.safeParse({ ...VALID, apellidoMaterno: 'López' }).success,
    ).toBe(true)
  })

  it('rejects a missing nombre', () => {
    expect(invitationFormSchema.safeParse({ ...VALID, nombre: '' }).success).toBe(false)
  })

  it('rejects a nombre with digits — mirrors the real backend NOMBRE pattern', () => {
    expect(invitationFormSchema.safeParse({ ...VALID, nombre: 'Pedro2' }).success).toBe(
      false,
    )
  })

  it('rejects an invalid correo', () => {
    expect(
      invitationFormSchema.safeParse({ ...VALID, correo: 'not-an-email' }).success,
    ).toBe(false)
  })

  it('accepts a valid submission with telefono omitted — the real backend validator treats it as optional', () => {
    expect(invitationFormSchema.safeParse(VALID).success).toBe(true)
  })

  it('accepts a valid submission with telefono present', () => {
    expect(
      invitationFormSchema.safeParse({ ...VALID, telefono: '8711234567' }).success,
    ).toBe(true)
  })

  it('accepts a telefono with a leading + — mirrors the real backend TELEFONO pattern', () => {
    expect(
      invitationFormSchema.safeParse({ ...VALID, telefono: '+528711234567' }).success,
    ).toBe(true)
  })

  it('rejects a telefono with fewer than 10 digits', () => {
    expect(invitationFormSchema.safeParse({ ...VALID, telefono: '12345' }).success).toBe(
      false,
    )
  })

  it('rejects a telefono with more than 15 digits', () => {
    expect(
      invitationFormSchema.safeParse({ ...VALID, telefono: '1234567890123456' }).success,
    ).toBe(false)
  })

  it('rejects a telefono with non-digit characters', () => {
    expect(
      invitationFormSchema.safeParse({ ...VALID, telefono: '871-123-4567' }).success,
    ).toBe(false)
  })
})
