import { describe, expect, it } from 'vitest'

import { WAITERS_FIXTURE } from '@/features/waiters/fixtures/waiterFixtures'
import { DEFAULT_WAITERS_FILTER_STATE } from '@/features/waiters/types/waiter'
import { filterWaiters } from '@/features/waiters/utils/filterWaiters'

describe('filterWaiters', () => {
  it('returns every waiter when filters are at their default (no filtering)', () => {
    expect(filterWaiters(WAITERS_FIXTURE, DEFAULT_WAITERS_FILTER_STATE)).toHaveLength(
      WAITERS_FIXTURE.length,
    )
  })

  it('filters by estadoCuenta', () => {
    const result = filterWaiters(WAITERS_FIXTURE, {
      ...DEFAULT_WAITERS_FILTER_STATE,
      estadoCuenta: 'inactivo',
    })

    expect(result.every((waiter) => waiter.estadoCuenta === 'inactivo')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(WAITERS_FIXTURE.length)
  })
})
