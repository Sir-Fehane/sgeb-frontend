import { describe, expect, it } from 'vitest'

import type { ClosureChecklistViewModel } from '@/features/events/live-operations/types/liveOperations'
import {
  CLOSURE_CHECKLIST_STATUS_LABELS,
  CLOSURE_CHECKLIST_STATUS_TONES,
  getSalidaBlockReason,
  isClosureChecklistApprovedForSalida,
  isEligibleForSalida,
} from '@/features/events/live-operations/utils/liveOperationsPresentation'

function checklist(
  overrides: Partial<ClosureChecklistViewModel> = {},
): ClosureChecklistViewModel {
  return {
    idChecklistInstancia: 900,
    idChecklist: 30,
    nombre: 'Checklist de salida — salón',
    status: 'pending',
    aprobadoEn: null,
    pendientes: 1,
    items: [],
    ...overrides,
  }
}

describe('isEligibleForSalida', () => {
  it('is true only for vinculo — matches the pinned backend TRANSICIONES map', () => {
    expect(isEligibleForSalida('vinculo')).toBe(true)
    for (const estado of [
      'aparto',
      'seleccionado',
      'confirmo_asistencia',
      'confirmo_llegada',
      'asignado',
      'salida',
    ] as const) {
      expect(isEligibleForSalida(estado)).toBe(false)
    }
  })
})

describe('isClosureChecklistApprovedForSalida', () => {
  it('is false when there is no closure checklist at all (undefined — not yet assigned)', () => {
    expect(isClosureChecklistApprovedForSalida(undefined)).toBe(false)
  })

  it('is false when the checklist status is pending (incomplete)', () => {
    expect(isClosureChecklistApprovedForSalida(checklist({ status: 'pending' }))).toBe(
      false,
    )
  })

  it('is false when the checklist status is completed but not approved', () => {
    expect(
      isClosureChecklistApprovedForSalida(
        checklist({ status: 'completed', aprobadoEn: null }),
      ),
    ).toBe(false)
  })

  it('is true only when the checklist status is approved (aprobado_en persisted)', () => {
    expect(
      isClosureChecklistApprovedForSalida(
        checklist({ status: 'approved', aprobadoEn: '2026-08-26T20:00:00.000Z' }),
      ),
    ).toBe(true)
  })
})

describe('getSalidaBlockReason', () => {
  it('explains "no checklist assigned" when undefined', () => {
    expect(getSalidaBlockReason(undefined)).toBe(
      'Asigna un checklist de salida antes de registrar la salida.',
    )
  })

  it('explains "must complete" when pending', () => {
    expect(getSalidaBlockReason(checklist({ status: 'pending' }))).toBe(
      'El mesero debe completar su checklist de salida.',
    )
  })

  it('explains "pending approval" when completed but not approved', () => {
    expect(getSalidaBlockReason(checklist({ status: 'completed' }))).toBe(
      'El checklist de salida está pendiente de aprobación.',
    )
  })

  it('returns undefined (no block) when approved', () => {
    expect(
      getSalidaBlockReason(
        checklist({ status: 'approved', aprobadoEn: '2026-08-26T20:00:00.000Z' }),
      ),
    ).toBeUndefined()
  })
})

describe('CLOSURE_CHECKLIST_STATUS_LABELS / CLOSURE_CHECKLIST_STATUS_TONES', () => {
  it('maps all three statuses — pending, completed, approved — to a distinct, non-empty label', () => {
    const labels = Object.values(CLOSURE_CHECKLIST_STATUS_LABELS)
    expect(Object.keys(CLOSURE_CHECKLIST_STATUS_LABELS).sort()).toEqual([
      'approved',
      'completed',
      'pending',
    ])
    expect(labels.every((label) => label.length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('gives approved the success tone, distinct from pending/completed', () => {
    expect(CLOSURE_CHECKLIST_STATUS_TONES.approved).toBe('success')
    expect(CLOSURE_CHECKLIST_STATUS_TONES.pending).not.toBe('success')
    expect(CLOSURE_CHECKLIST_STATUS_TONES.completed).not.toBe('success')
  })
})
