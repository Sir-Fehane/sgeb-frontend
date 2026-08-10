import { describe, expect, it } from 'vitest'

import {
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_STATUS_TONES,
  MESA_ESTADO_LABELS,
  MESA_ESTADO_TONES,
} from '@/features/events/montage/utils/montagePresentation'

describe('CHECKLIST_STATUS_LABELS / CHECKLIST_STATUS_TONES', () => {
  it('maps every checklist status to a safe Spanish label', () => {
    expect(CHECKLIST_STATUS_LABELS.pending).toBe('Checklist pendiente')
    expect(CHECKLIST_STATUS_LABELS.completed).toBe('Checklist completo · sin aprobar')
    expect(CHECKLIST_STATUS_LABELS.approved).toBe('Checklist aprobado')
  })

  it('gives every status a tone, text never relying on color alone', () => {
    expect(CHECKLIST_STATUS_TONES.pending).toBeDefined()
    expect(CHECKLIST_STATUS_TONES.completed).toBeDefined()
    expect(CHECKLIST_STATUS_TONES.approved).toBeDefined()
  })

  it('gives approved the success tone, distinct from pending/completed', () => {
    expect(CHECKLIST_STATUS_TONES.approved).toBe('success')
    expect(CHECKLIST_STATUS_TONES.pending).not.toBe('success')
    expect(CHECKLIST_STATUS_TONES.completed).not.toBe('success')
  })

  it('provides a distinct, non-empty label for every status', () => {
    const labels = Object.values(CHECKLIST_STATUS_LABELS)

    expect(labels.every((label) => label.length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('MESA_ESTADO_LABELS / MESA_ESTADO_TONES', () => {
  it('maps exactly the two documented mesa states — libre and ocupada, nothing invented', () => {
    expect(Object.keys(MESA_ESTADO_LABELS).sort()).toEqual(['libre', 'ocupada'])
    expect(MESA_ESTADO_LABELS.libre).toBe('Libre')
    expect(MESA_ESTADO_LABELS.ocupada).toBe('Ocupada')
  })

  it('gives libre and ocupada distinct tones', () => {
    expect(MESA_ESTADO_TONES.libre).not.toBe(MESA_ESTADO_TONES.ocupada)
  })
})
