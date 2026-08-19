import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearEventCreateDraft,
  consumeEventCreateDraft,
  saveEventCreateDraft,
} from '@/features/events/utils/eventCreateDraft'
import type { EventCreateFormValues } from '@/features/events/schemas/eventCreateSchema'

const STORAGE_KEY = 'sgeb:event-create:auth-recovery-draft'

const VALUES: EventCreateFormValues = {
  id_salon: 1,
  titulo: 'Boda García',
  tipo: 'social',
  fecha: '2099-01-10',
  hora_presentacion: '16:00',
  hora_inicio: '18:00',
  cupo_meseros: 5,
  num_mesas: 10,
  tarifa_por_mesero: 400,
  radio_geocerca_m: 150,
}

beforeEach(() => {
  sessionStorage.clear()
  vi.useRealTimers()
})

describe('saveEventCreateDraft / consumeEventCreateDraft', () => {
  it('round-trips the exact form values', () => {
    expect(saveEventCreateDraft(VALUES)).toBe(true)

    expect(consumeEventCreateDraft()).toEqual(VALUES)
  })

  it('consumes the draft exactly once — a second read finds nothing', () => {
    saveEventCreateDraft(VALUES)

    consumeEventCreateDraft()
    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('returns null when no draft was ever saved', () => {
    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('discards malformed JSON safely', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not valid json')

    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('discards an unexpected/tampered shape safely', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'world' }))

    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('discards an unsupported version', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, savedAt: Date.now(), values: VALUES }),
    )

    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('discards a draft with a field of the wrong type (structural guard against corruption)', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        values: { ...VALUES, id_salon: 'not-a-number' },
      }),
    )

    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('discards an expired snapshot', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'))
    saveEventCreateDraft(VALUES)

    vi.setSystemTime(new Date('2099-01-01T00:15:00Z')) // 15 minutes later, past the TTL
    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('still restores a snapshot saved well within the TTL', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'))
    saveEventCreateDraft(VALUES)

    vi.setSystemTime(new Date('2099-01-01T00:05:00Z')) // 5 minutes later, inside the TTL
    expect(consumeEventCreateDraft()).toEqual(VALUES)
  })

  it('returns false, never throws, when sessionStorage.setItem fails', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    expect(() => saveEventCreateDraft(VALUES)).not.toThrow()
    expect(saveEventCreateDraft(VALUES)).toBe(false)

    setItemSpy.mockRestore()
  })

  it('returns null, never throws, when sessionStorage.getItem fails', () => {
    saveEventCreateDraft(VALUES)
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    expect(() => consumeEventCreateDraft()).not.toThrow()
    expect(consumeEventCreateDraft()).toBeNull()

    getItemSpy.mockRestore()
  })
})

describe('clearEventCreateDraft', () => {
  it('removes a stored draft without restoring it', () => {
    saveEventCreateDraft(VALUES)

    clearEventCreateDraft()

    expect(consumeEventCreateDraft()).toBeNull()
  })

  it('is a safe no-op when nothing was stored', () => {
    expect(() => {
      clearEventCreateDraft()
    }).not.toThrow()
  })

  it('never throws even if sessionStorage.removeItem fails', () => {
    const removeItemSpy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('storage disabled')
      })

    expect(() => {
      clearEventCreateDraft()
    }).not.toThrow()

    removeItemSpy.mockRestore()
  })
})
