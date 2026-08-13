import { describe, expect, it } from 'vitest'

import { isApiEnvelope } from '@/shared/api/apiEnvelope'

describe('isApiEnvelope', () => {
  it('accepts a valid envelope with a success result', () => {
    expect(
      isApiEnvelope({
        result: { code: 'SGEB-0000', message: 'Operación realizada correctamente.' },
        data: { foo: 'bar' },
      }),
    ).toBe(true)
  })

  it('accepts a valid envelope with null data (e.g. SGEB-0002)', () => {
    expect(
      isApiEnvelope({
        result: { code: 'SGEB-0002', message: 'No encontramos resultados.' },
        data: null,
      }),
    ).toBe(true)
  })

  it('rejects a non-object value', () => {
    expect(isApiEnvelope('not an object')).toBe(false)
    expect(isApiEnvelope(null)).toBe(false)
    expect(isApiEnvelope(undefined)).toBe(false)
  })

  it('rejects a value missing the result block', () => {
    expect(isApiEnvelope({ data: {} })).toBe(false)
  })

  it('rejects a value missing the data key entirely', () => {
    expect(isApiEnvelope({ result: { code: 'SGEB-0000', message: 'x' } })).toBe(false)
  })

  it('rejects a result block missing code or message', () => {
    expect(isApiEnvelope({ result: { message: 'x' }, data: null })).toBe(false)
    expect(isApiEnvelope({ result: { code: 'SGEB-0000' }, data: null })).toBe(false)
  })

  it('rejects an HTML/non-JSON error page shape', () => {
    expect(isApiEnvelope('<html><body>502 Bad Gateway</body></html>')).toBe(false)
  })
})
