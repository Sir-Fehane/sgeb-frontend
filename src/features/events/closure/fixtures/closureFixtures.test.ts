import { describe, expect, it } from 'vitest'

import {
  assertReadinessConsistency,
  findEventClosureReadiness,
  findMermaReports,
} from '@/features/events/closure/fixtures/closureFixtures'
import { findEventDetailFixture } from '@/features/events/fixtures/eventDetailFixtures'

describe('findEventClosureReadiness', () => {
  it('event 1001 — blocked fixture: not finalized, real blockers, listo=false', () => {
    const readiness = findEventClosureReadiness(1001)

    expect(readiness).not.toBeNull()
    expect(readiness?.eventoFinalizado).toBe(false)
    expect(readiness?.participacionesTotal).toBeGreaterThan(0)
    expect(readiness?.participacionesSinSalida).toBeGreaterThan(0)
    expect(readiness?.meserosSinClabeVigente).toBeGreaterThan(0)
    expect(readiness?.listo).toBe(false)
  })

  it('event 2001 — in-progress fixture: not finalized, no other blockers, listo=false', () => {
    const readiness = findEventClosureReadiness(2001)

    expect(readiness).not.toBeNull()
    expect(readiness?.eventoFinalizado).toBe(false)
    expect(readiness?.participacionesTotal).toBeGreaterThan(0)
    expect(readiness?.participacionesSinSalida).toBe(0)
    expect(readiness?.meserosSinClabeVigente).toBe(0)
    expect(readiness?.listo).toBe(false)
  })

  it('event 3001 — ready fixture: finalized, zero blockers, listo=true', () => {
    const readiness = findEventClosureReadiness(3001)

    expect(readiness).not.toBeNull()
    expect(readiness?.eventoFinalizado).toBe(true)
    expect(readiness?.participacionesTotal).toBeGreaterThan(0)
    expect(readiness?.participacionesSinSalida).toBe(0)
    expect(readiness?.meserosSinClabeVigente).toBe(0)
    expect(readiness?.listo).toBe(true)
  })

  it('returns null for an event with no closure fixture', () => {
    expect(findEventClosureReadiness(999999)).toBeNull()
  })
})

describe('closure readiness vs shared Event Detail estado — cross-fixture coherence', () => {
  it('every eventoFinalizado=true closure fixture is paired with a shared event whose own estado is finalizado', () => {
    for (const idEvento of [1001, 2001, 3001]) {
      const readiness = findEventClosureReadiness(idEvento)
      const evento = findEventDetailFixture(idEvento)
      if (!readiness || !evento) {
        continue
      }

      if (readiness.eventoFinalizado) {
        expect(evento.estado).toBe('finalizado')
      } else {
        expect(evento.estado).not.toBe('finalizado')
      }
    }
  })

  it('listo=true only ever appears alongside eventoFinalizado=true and zero other blockers', () => {
    for (const idEvento of [1001, 2001, 3001]) {
      const readiness = findEventClosureReadiness(idEvento)
      if (!readiness?.listo) {
        continue
      }

      expect(readiness.eventoFinalizado).toBe(true)
      expect(readiness.participacionesSinSalida).toBe(0)
      expect(readiness.meserosSinClabeVigente).toBe(0)
    }
  })
})

describe('assertReadinessConsistency', () => {
  it('accepts a coherent fixture — listo matches the other three fields', () => {
    expect(() =>
      assertReadinessConsistency({
        eventoFinalizado: true,
        participacionesTotal: 3,
        participacionesSinSalida: 0,
        meserosSinClabeVigente: 0,
        listo: true,
      }),
    ).not.toThrow()
  })

  it('rejects a fixture claiming listo=true while a blocker is still present — never silently trusts an invented value', () => {
    expect(() =>
      assertReadinessConsistency({
        eventoFinalizado: true,
        participacionesTotal: 3,
        participacionesSinSalida: 1,
        meserosSinClabeVigente: 0,
        listo: true,
      }),
    ).toThrow()
  })

  it('rejects a fixture claiming listo=false while all three blockers are actually resolved', () => {
    expect(() =>
      assertReadinessConsistency({
        eventoFinalizado: true,
        participacionesTotal: 3,
        participacionesSinSalida: 0,
        meserosSinClabeVigente: 0,
        listo: false,
      }),
    ).toThrow()
  })
})

describe('findMermaReports', () => {
  it('event 1001 has at least one existing merma report', () => {
    const reports = findMermaReports(1001)

    expect(reports.length).toBeGreaterThan(0)
    expect(reports[0]?.detalles.length).toBeGreaterThan(0)
  })

  it('events 2001 and 3001 have zero existing merma reports', () => {
    expect(findMermaReports(2001)).toEqual([])
    expect(findMermaReports(3001)).toEqual([])
  })

  it('returns an empty list for an event with no fixture data at all', () => {
    expect(findMermaReports(999999)).toEqual([])
  })

  it('every report has a positive numeric idReporte', () => {
    const reports = findMermaReports(1001)

    for (const report of reports) {
      expect(report.idReporte).toBeGreaterThan(0)
    }
  })
})
