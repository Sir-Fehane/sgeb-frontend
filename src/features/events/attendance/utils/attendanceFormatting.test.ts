import { describe, expect, it } from 'vitest'

import { formatArrivalTime } from '@/features/events/attendance/utils/attendanceFormatting'

describe('formatArrivalTime', () => {
  it('formats a naive (no-offset) timestamp as local wall-clock time', () => {
    const input = '2026-09-12T17:53:00'
    const formatted = formatArrivalTime(input)

    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toBe(
      new Date(input).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    )
  })

  it('formats a Z (UTC) timestamp correctly', () => {
    const input = '2026-09-12T17:53:00Z'
    const formatted = formatArrivalTime(input)

    expect(formatted).toBe(
      new Date(input).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    )
  })

  it('formats a numeric-offset timestamp correctly', () => {
    const input = '2026-09-12T11:53:00-06:00'
    const formatted = formatArrivalTime(input)

    expect(formatted).toBe(
      new Date(input).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    )
  })

  it('formats a Z timestamp and its equivalent numeric-offset timestamp identically', () => {
    const utc = formatArrivalTime('2026-09-12T17:53:00Z')
    const equivalentOffset = formatArrivalTime('2026-09-12T11:53:00-06:00')

    expect(utc).toBe(equivalentOffset)
  })
})
