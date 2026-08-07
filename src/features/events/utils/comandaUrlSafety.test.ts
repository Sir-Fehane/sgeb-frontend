import { describe, expect, it } from 'vitest'

import { isSafeComandaUrl } from '@/features/events/utils/comandaUrlSafety'

describe('isSafeComandaUrl', () => {
  it('accepts a valid https URL', () => {
    expect(isSafeComandaUrl('https://files.mediocres.mx/comandas/evento-1001.pdf')).toBe(
      true,
    )
  })

  it('accepts a valid http URL', () => {
    expect(isSafeComandaUrl('http://files.mediocres.mx/comanda.pdf')).toBe(true)
  })

  it('rejects undefined (no comanda)', () => {
    expect(isSafeComandaUrl(undefined)).toBe(false)
  })

  it('rejects a javascript: URL', () => {
    expect(isSafeComandaUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects a relative or schemeless value', () => {
    expect(isSafeComandaUrl('/comanda.pdf')).toBe(false)
    expect(isSafeComandaUrl('files.mediocres.mx/comanda.pdf')).toBe(false)
  })

  it('rejects a value containing whitespace', () => {
    expect(isSafeComandaUrl('https://files.mediocres.mx/comanda con espacio.pdf')).toBe(
      false,
    )
  })
})
