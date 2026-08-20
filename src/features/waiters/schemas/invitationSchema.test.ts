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

  it('has no telefono field at all — the real backend validator does not accept one', () => {
    expect('telefono' in invitationFormSchema.shape).toBe(false)
  })
})
