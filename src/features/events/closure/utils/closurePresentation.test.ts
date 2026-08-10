import { describe, expect, it } from 'vitest'

import { WASTE_TYPE_LABELS } from '@/features/events/closure/utils/closurePresentation'

describe('WASTE_TYPE_LABELS', () => {
  it('maps exactly the five documented waste categories — nothing invented', () => {
    expect(Object.keys(WASTE_TYPE_LABELS).sort()).toEqual(
      ['comida_desperdiciada', 'copa_rota', 'otro', 'plato_roto', 'vaso_roto'].sort(),
    )
  })

  it('gives every category a safe, non-empty Spanish label', () => {
    expect(WASTE_TYPE_LABELS.vaso_roto).toBe('Vaso roto')
    expect(WASTE_TYPE_LABELS.plato_roto).toBe('Plato roto')
    expect(WASTE_TYPE_LABELS.copa_rota).toBe('Copa rota')
    expect(WASTE_TYPE_LABELS.comida_desperdiciada).toBe('Comida desperdiciada')
    expect(WASTE_TYPE_LABELS.otro).toBe('Otro')
  })
})
