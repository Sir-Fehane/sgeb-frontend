import { describe, expect, it } from 'vitest'

import {
  formatEventDate,
  formatEventDateTime,
  formatEventGeofenceRadius,
  formatEventPresentationTime,
  formatEventTarifa,
  formatEventTime,
  formatSalonAddress,
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

describe('formatSalonAddress', () => {
  const FULL = {
    calle: 'Blvd. Independencia 1234',
    colonia: 'Centro',
    cp: '27000',
    ciudad: 'Torreón',
    estado: 'Coahuila',
  }

  it('joins every piece in order, with Col./CP prefixes and ciudad+estado combined', () => {
    expect(formatSalonAddress(FULL)).toBe(
      'Blvd. Independencia 1234 · Col. Centro · Torreón, Coahuila · CP 27000',
    )
  })

  it('omits a missing piece gracefully — no "undefined", no dangling separator', () => {
    expect(formatSalonAddress({ ...FULL, colonia: undefined })).toBe(
      'Blvd. Independencia 1234 · Torreón, Coahuila · CP 27000',
    )
  })

  it('omits ciudad or estado individually without leaving a stray comma', () => {
    expect(formatSalonAddress({ ...FULL, estado: undefined })).toBe(
      'Blvd. Independencia 1234 · Col. Centro · Torreón · CP 27000',
    )
    expect(formatSalonAddress({ ...FULL, ciudad: undefined })).toBe(
      'Blvd. Independencia 1234 · Col. Centro · Coahuila · CP 27000',
    )
  })

  it('treats a blank string the same as a missing piece', () => {
    expect(formatSalonAddress({ ...FULL, cp: '   ' })).toBe(
      'Blvd. Independencia 1234 · Col. Centro · Torreón, Coahuila',
    )
  })

  it('returns null when nothing at all is available', () => {
    expect(formatSalonAddress({})).toBeNull()
  })

  it('returns a single piece unmodified — no stray separators — when only one is present', () => {
    expect(formatSalonAddress({ calle: 'Blvd. Independencia 1234' })).toBe(
      'Blvd. Independencia 1234',
    )
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

describe('formatEventPresentationTime', () => {
  it('formats an HH:MM wire value using the same es-MX 12-hour convention as formatEventTime', () => {
    const reference = new Date()
    reference.setHours(18, 0, 0, 0)

    expect(formatEventPresentationTime('18:00')).toBe(
      reference.toLocaleTimeString('es-MX', { timeStyle: 'short' }),
    )
  })

  it('formats an HH:MM:SS wire value (the backend echoes seconds this field never captures) identically to its HH:MM form', () => {
    expect(formatEventPresentationTime('18:00:00')).toBe(
      formatEventPresentationTime('18:00'),
    )
  })

  it("matches formatEventTime's output for the exact same clock time — the two Schedule rows read consistently", () => {
    expect(formatEventPresentationTime('18:09')).toBe(
      formatEventTime('2026-09-12T18:09:00'),
    )
  })

  it('never shows seconds, even though the wire value may carry :00', () => {
    expect(formatEventPresentationTime('18:00:00')).not.toMatch(/:00$/)
  })

  it('never shifts the hour — the exact hour/minute named is the exact hour/minute shown, regardless of runtime timezone', () => {
    const formatted = formatEventPresentationTime('00:05')
    const reference = new Date()
    reference.setHours(0, 5, 0, 0)

    expect(formatted).toBe(reference.toLocaleTimeString('es-MX', { timeStyle: 'short' }))
  })

  it('returns the raw value unchanged if it does not match the expected HH:MM(:SS) shape', () => {
    expect(formatEventPresentationTime('not-a-time')).toBe('not-a-time')
  })
})
