import { describe, expect, it } from 'vitest'

import {
  ARRIVAL_METODO_LABELS,
  MOTIVO_FALLO_PRESENTATION,
  PARTICIPATION_LABELS,
  PARTICIPATION_TONES,
} from '@/features/events/attendance/utils/attendancePresentation'

describe('PARTICIPATION_LABELS / PARTICIPATION_TONES', () => {
  it('maps every documented participation state to a safe Spanish label', () => {
    expect(PARTICIPATION_LABELS.seleccionado).toBe('Seleccionado')
    expect(PARTICIPATION_LABELS.confirmo_asistencia).toBe('Asistencia confirmada')
    expect(PARTICIPATION_LABELS.confirmo_llegada).toBe('Llegada confirmada')
  })

  it('gives every state a tone, text never relying on color alone', () => {
    expect(PARTICIPATION_TONES.seleccionado).toBeDefined()
    expect(PARTICIPATION_TONES.confirmo_asistencia).toBeDefined()
    expect(PARTICIPATION_TONES.confirmo_llegada).toBeDefined()
  })
})

describe('ARRIVAL_METODO_LABELS', () => {
  it('maps every documented metodo to a safe label', () => {
    expect(ARRIVAL_METODO_LABELS.huella).toBe('Huella')
    expect(ARRIVAL_METODO_LABELS.face_id).toBe('Face ID')
    expect(ARRIVAL_METODO_LABELS.ninguno).toBe('Sin biometría')
  })
})

describe('MOTIVO_FALLO_PRESENTATION', () => {
  it('never labels precision_insuficiente as absent/denied, and does not flag it for review', () => {
    const presentation = MOTIVO_FALLO_PRESENTATION.precision_insuficiente

    expect(presentation.label.toLowerCase()).not.toContain('ausente')
    expect(presentation.label.toLowerCase()).not.toContain('falta')
    expect(presentation.requiresReview).toBe(false)
  })

  it('gives dispositivo_de_otro_usuario the most severe tone — the documented collusion signal', () => {
    const otroUsuario = MOTIVO_FALLO_PRESENTATION.dispositivo_de_otro_usuario
    const noVinculado = MOTIVO_FALLO_PRESENTATION.dispositivo_no_vinculado

    expect(otroUsuario.tone).toBe('danger')
    expect(otroUsuario.requiresReview).toBe(true)
    // dispositivo_no_vinculado is a legitimate, less severe scenario (phone replacement).
    expect(noVinculado.tone).not.toBe('danger')
  })

  it('flags fuera_geocerca and biometria_fallida for review, distinct from the inconclusive case', () => {
    expect(MOTIVO_FALLO_PRESENTATION.fuera_geocerca.requiresReview).toBe(true)
    expect(MOTIVO_FALLO_PRESENTATION.biometria_fallida.requiresReview).toBe(true)
    expect(MOTIVO_FALLO_PRESENTATION.precision_insuficiente.requiresReview).toBe(false)
  })

  it('provides a distinct, non-empty label for every documented motive', () => {
    const labels = Object.values(MOTIVO_FALLO_PRESENTATION).map((entry) => entry.label)

    expect(labels.every((label) => label.length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
