import { describe, expect, it } from 'vitest'

import { WAITER_PERFORMANCE_REPORT_FIXTURE } from '@/features/reports/fixtures/reportFixtures'
import type { WaiterPerformanceReportItem } from '@/features/reports/types/report'
import { sortWaiterPerformanceReport } from '@/features/reports/utils/sortWaiterPerformanceReport'

function names(items: readonly WaiterPerformanceReportItem[]): string[] {
  return items.map((item) => item.nombreCompleto)
}

describe('sortWaiterPerformanceReport', () => {
  it('orders by calificacion descending, with a null rating sorted after every rated waiter', () => {
    const result = sortWaiterPerformanceReport(
      WAITER_PERFORMANCE_REPORT_FIXTURE,
      'calificacion',
    )

    // Fixture ratings: Ana 4.8, Diego 4.2, Carla 3.9, Bruno null.
    expect(names(result)).toEqual([
      'Ana Torres',
      'Diego Ramírez',
      'Carla Núñez',
      'Bruno Salas',
    ])
  })

  it('orders by asistencias (asistenciasConfirmadas) descending', () => {
    const result = sortWaiterPerformanceReport(
      WAITER_PERFORMANCE_REPORT_FIXTURE,
      'asistencias',
    )

    // Fixture: Carla 14, Ana 12, Diego 8, Bruno 7.
    expect(names(result)).toEqual([
      'Carla Núñez',
      'Ana Torres',
      'Diego Ramírez',
      'Bruno Salas',
    ])
  })

  it('orders by monto_pagado (montoPagado) descending', () => {
    const result = sortWaiterPerformanceReport(
      WAITER_PERFORMANCE_REPORT_FIXTURE,
      'monto_pagado',
    )

    // Fixture: Ana 6000, Carla 5400, Bruno 3200, Diego 2800.
    expect(names(result)).toEqual([
      'Ana Torres',
      'Carla Núñez',
      'Bruno Salas',
      'Diego Ramírez',
    ])
  })

  it('does not mutate the original fixture array', () => {
    const originalOrder = names(WAITER_PERFORMANCE_REPORT_FIXTURE)

    sortWaiterPerformanceReport(WAITER_PERFORMANCE_REPORT_FIXTURE, 'asistencias')

    expect(names(WAITER_PERFORMANCE_REPORT_FIXTURE)).toEqual(originalOrder)
  })

  it('falls back to a deterministic name-based tie-break when the primary metric ties', () => {
    const base = WAITER_PERFORMANCE_REPORT_FIXTURE[0]
    if (!base) {
      throw new Error('Expected at least one fixture item')
    }
    const tied: WaiterPerformanceReportItem[] = [
      { ...base, nombreCompleto: 'Zulema', montoPagado: 1000 },
      { ...base, nombreCompleto: 'Andrea', montoPagado: 1000 },
    ]

    const result = sortWaiterPerformanceReport(tied, 'monto_pagado')

    expect(names(result)).toEqual(['Andrea', 'Zulema'])
  })
})
