import { describe, expect, it } from 'vitest'

import { buildMesaPublicaUrl } from '@/features/events/utils/mesaQrUrl'

describe('buildMesaPublicaUrl', () => {
  it('builds the exact public diner route for the given codigoQr', () => {
    expect(buildMesaPublicaUrl('3f2a9c14-1234-4abc-89ab-000000000000')).toBe(
      `${window.location.origin}/publico/mesas/3f2a9c14-1234-4abc-89ab-000000000000`,
    )
  })

  it('uses the current window origin, never a hardcoded domain', () => {
    expect(buildMesaPublicaUrl('abc').startsWith(window.location.origin)).toBe(true)
    expect(buildMesaPublicaUrl('abc')).not.toContain('mediocres-inc.online')
  })

  it('percent-encodes special characters in codigoQr', () => {
    expect(buildMesaPublicaUrl('a b/c')).toBe(
      `${window.location.origin}/publico/mesas/a%20b%2Fc`,
    )
  })
})
