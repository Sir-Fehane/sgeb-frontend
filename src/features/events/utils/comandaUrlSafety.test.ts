import { describe, expect, it } from 'vitest'

import { isSafeComandaUrl } from '@/features/events/utils/comandaUrlSafety'

describe('isSafeComandaUrl', () => {
  it('accepts a fresh https signed URL (production/S3 shape)', () => {
    expect(
      isSafeComandaUrl(
        'https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf?X-Amz-Signature=abc',
      ),
    ).toBe(true)
  })

  it('accepts a valid http URL', () => {
    expect(isSafeComandaUrl('http://storage.sgeb.mx/comanda.pdf')).toBe(true)
  })

  it('rejects the local/dev non-navigable placeholder', () => {
    expect(isSafeComandaUrl('local://comandas/1001/3f2a9c14.pdf')).toBe(false)
  })

  it('rejects null and undefined (no comanda / no url on the response)', () => {
    expect(isSafeComandaUrl(null)).toBe(false)
    expect(isSafeComandaUrl(undefined)).toBe(false)
  })

  it('rejects a javascript: URL', () => {
    expect(isSafeComandaUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects a relative or schemeless value', () => {
    expect(isSafeComandaUrl('/comanda.pdf')).toBe(false)
    expect(isSafeComandaUrl('storage.sgeb.mx/comanda.pdf')).toBe(false)
  })

  it('rejects a value containing whitespace', () => {
    expect(isSafeComandaUrl('https://storage.sgeb.mx/comanda con espacio.pdf')).toBe(
      false,
    )
  })
})
