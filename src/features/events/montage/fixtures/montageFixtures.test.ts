import { describe, expect, it } from 'vitest'

import { findMontageTables } from '@/features/events/montage/fixtures/montageFixtures'

describe('findMontageTables', () => {
  it('returns event 1001’s table roster with both free and occupied tables', () => {
    const tables = findMontageTables(1001)

    expect(tables.some((mesa) => mesa.estado === 'libre')).toBe(true)
    expect(tables.some((mesa) => mesa.estado === 'ocupada')).toBe(true)
  })

  it('never exposes codigo_qr or token_comensal on any table', () => {
    const tables = findMontageTables(1001)

    for (const mesa of tables) {
      expect(mesa).not.toHaveProperty('codigoQr')
      expect(mesa).not.toHaveProperty('codigo_qr')
      expect(mesa).not.toHaveProperty('tokenComensal')
      expect(mesa).not.toHaveProperty('token_comensal')
    }
  })

  it('uses only the two documented mesa states — libre or ocupada', () => {
    const tables = findMontageTables(1001)

    for (const mesa of tables) {
      expect(['libre', 'ocupada']).toContain(mesa.estado)
    }
  })

  it('returns an empty list for an event with no table fixture data', () => {
    expect(findMontageTables(2001)).toEqual([])
    expect(findMontageTables(999999)).toEqual([])
  })
})
