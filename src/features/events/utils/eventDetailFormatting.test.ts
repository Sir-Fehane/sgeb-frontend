import { describe, expect, it } from 'vitest'

import {
  formatEventDate,
  formatEventDateTime,
  formatEventGeofenceRadius,
  formatEventTarifa,
  formatEventTime,
} from '@/features/events/utils/eventDetailFormatting'

describe('formatEventTarifa', () => {
  it('formats an amount as MXN currency', () => {
    expect(formatEventTarifa(450)).toContain('450')
    expect(formatEventTarifa(450)).toMatch(/\$/)
  })
})

describe('formatEventGeofenceRadius', () => {
  it('formats meters as a plain, readable unit', () => {
    expect(formatEventGeofenceRadius(150)).toBe('150 m')
  })
})

describe('formatEventDate', () => {
  it('formats a date-only string as DD/MM/YYYY without a UTC shift', () => {
    expect(formatEventDate('2026-09-12')).toBe('12/09/2026')
  })

  it('returns the raw value unchanged if it does not match the expected shape', () => {
    expect(formatEventDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatEventDateTime', () => {
  it('formats a naive (no-offset) date-time as local wall-clock time', () => {
    const input = '2026-09-12T18:00:00'
    const formatted = formatEventDateTime(input)

    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toBe(
      new Date(input).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    )
  })

  it('formats a Z (UTC) date-time correctly', () => {
    const input = '2026-09-12T18:00:00Z'
    const formatted = formatEventDateTime(input)

    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toBe(
      new Date(input).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    )
  })

  it('formats a numeric-offset date-time correctly', () => {
    const input = '2026-09-12T12:00:00-06:00'
    const formatted = formatEventDateTime(input)

    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toBe(
      new Date(input).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    )
  })

  it('formats a Z timestamp and its equivalent numeric-offset timestamp identically — same instant, same display, regardless of the test runner timezone', () => {
    const utc = formatEventDateTime('2026-09-12T18:00:00Z')
    const equivalentOffset = formatEventDateTime('2026-09-12T12:00:00-06:00')

    expect(utc).toBe(equivalentOffset)
  })
})

describe('formatEventTime', () => {
  it("formats only inicio's time component, matching Date's own locale time formatting", () => {
    const input = '2026-09-12T18:00:00'
    expect(formatEventTime(input)).toBe(
      new Date(input).toLocaleString('es-MX', { timeStyle: 'short' }),
    )
  })

  it('never includes the date — the date is already shown separately (Fecha)', () => {
    expect(formatEventTime('2026-09-12T18:00:00')).not.toMatch(/2026/)
  })
})
