import { describe, expect, it } from 'vitest'

import { EVENTOS_FIXTURE } from '@/features/events/fixtures/eventFixtures'
import { DEFAULT_EVENTS_FILTER_STATE } from '@/features/events/types/event'
import { filterEvents } from '@/features/events/utils/filterEvents'

describe('filterEvents', () => {
  it('returns every event when filters are at their default (no filtering)', () => {
    expect(filterEvents(EVENTOS_FIXTURE, DEFAULT_EVENTS_FILTER_STATE)).toHaveLength(
      EVENTOS_FIXTURE.length,
    )
  })

  it('filters by estado', () => {
    const result = filterEvents(EVENTOS_FIXTURE, {
      ...DEFAULT_EVENTS_FILTER_STATE,
      estado: 'cancelado',
    })

    expect(result.every((evento) => evento.estado === 'cancelado')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('filters by idSalon', () => {
    const result = filterEvents(EVENTOS_FIXTURE, {
      ...DEFAULT_EVENTS_FILTER_STATE,
      idSalon: 1,
    })

    expect(result.every((evento) => evento.idSalon === 1)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('filters by a fecha_desde / fecha_hasta range', () => {
    const result = filterEvents(EVENTOS_FIXTURE, {
      ...DEFAULT_EVENTS_FILTER_STATE,
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
    })

    expect(
      result.every(
        (evento) => evento.fecha >= '2026-08-01' && evento.fecha <= '2026-08-31',
      ),
    ).toBe(true)
  })

  it('combines all four dimensions and can return an empty result', () => {
    const result = filterEvents(EVENTOS_FIXTURE, {
      estado: 'cancelado',
      idSalon: 3,
      fechaDesde: null,
      fechaHasta: null,
    })

    expect(result).toHaveLength(0)
  })
})
