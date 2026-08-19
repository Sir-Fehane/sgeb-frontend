import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildInicioDateTime,
  getTodayIsoDate,
} from '@/features/events/utils/eventScheduling'

describe('getTodayIsoDate', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("never derives the date via toISOString — that always renders UTC, which would silently report tomorrow's date while it is still today in a negative-offset local timezone, near midnight", () => {
    const toIsoStringSpy = vi.spyOn(Date.prototype, 'toISOString')

    getTodayIsoDate()

    expect(toIsoStringSpy).not.toHaveBeenCalled()
  })

  it('derives the date from local wall-clock accessors (getFullYear/getMonth/getDate)', () => {
    const getFullYearSpy = vi.spyOn(Date.prototype, 'getFullYear')
    const getMonthSpy = vi.spyOn(Date.prototype, 'getMonth')
    const getDateSpy = vi.spyOn(Date.prototype, 'getDate')

    getTodayIsoDate()

    expect(getFullYearSpy).toHaveBeenCalled()
    expect(getMonthSpy).toHaveBeenCalled()
    expect(getDateSpy).toHaveBeenCalled()
  })

  it('formats as YYYY-MM-DD, padding single-digit month/day to two digits', () => {
    // A local-time constructor call — always the host's own wall-clock
    // date, by definition, regardless of the host's timezone.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 5)) // March 5, 2026 — local

    expect(getTodayIsoDate()).toBe('2026-03-05')
  })
})

describe('buildInicioDateTime', () => {
  it('joins fecha and horaInicio into a naive datetime string, matching the previous datetime-local input shape', () => {
    expect(buildInicioDateTime('2026-09-12', '18:00')).toBe('2026-09-12T18:00')
  })

  it('introduces no timezone offset or Z suffix', () => {
    const result = buildInicioDateTime('2026-09-12', '18:00')
    expect(result).not.toMatch(/[Z+-]\d\d:\d\d$|Z$/)
  })
})
