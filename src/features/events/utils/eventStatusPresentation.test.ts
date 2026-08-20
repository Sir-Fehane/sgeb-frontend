import { describe, expect, it } from 'vitest'

import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_TONES,
  EVENT_STATUS_TRANSITION_TOAST_TITLES,
} from '@/features/events/utils/eventStatusPresentation'

describe('EVENT_STATUS_LABELS / EVENT_STATUS_TONES', () => {
  it('maps every documented estado to a safe Spanish label', () => {
    expect(Object.keys(EVENT_STATUS_LABELS).sort()).toEqual(
      ['borrador', 'cancelado', 'en_curso', 'finalizado', 'publicado'].sort(),
    )
  })

  it('gives every estado a tone', () => {
    for (const estado of Object.keys(
      EVENT_STATUS_LABELS,
    ) as (keyof typeof EVENT_STATUS_LABELS)[]) {
      expect(EVENT_STATUS_TONES[estado]).toBeDefined()
    }
  })
})

describe('EVENT_STATUS_TRANSITION_TOAST_TITLES', () => {
  it('covers exactly the five documented estado values — the full PATCH /eventos/{id}/estado target set', () => {
    expect(Object.keys(EVENT_STATUS_TRANSITION_TOAST_TITLES).sort()).toEqual(
      ['borrador', 'cancelado', 'en_curso', 'finalizado', 'publicado'].sort(),
    )
  })

  it('uses the exact requested action-completed copy for the three primary transitions', () => {
    expect(EVENT_STATUS_TRANSITION_TOAST_TITLES.publicado).toBe('Evento publicado')
    expect(EVENT_STATUS_TRANSITION_TOAST_TITLES.en_curso).toBe('Evento iniciado')
    expect(EVENT_STATUS_TRANSITION_TOAST_TITLES.finalizado).toBe('Evento finalizado')
  })

  it('provides a distinct, non-empty title for every transition target', () => {
    const titles = Object.values(EVENT_STATUS_TRANSITION_TOAST_TITLES)

    expect(titles.every((title) => title.length > 0)).toBe(true)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
