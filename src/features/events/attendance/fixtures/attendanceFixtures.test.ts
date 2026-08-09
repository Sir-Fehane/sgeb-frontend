import { describe, expect, it } from 'vitest'

import { findAttendanceParticipants } from '@/features/events/attendance/fixtures/attendanceFixtures'
import { findTeamSelectionParticipants } from '@/features/events/team-selection/fixtures/teamSelectionFixtures'

describe('findAttendanceParticipants', () => {
  it('reuses the real selected participant from Team Selection for event 1001', () => {
    const teamSelectionSelected = findTeamSelectionParticipants(1001).find(
      (participant) => participant.estado === 'seleccionado',
    )
    const attendanceParticipants = findAttendanceParticipants(1001)

    expect(teamSelectionSelected).toBeDefined()
    const reused = attendanceParticipants.find(
      (participant) =>
        participant.idParticipacion === teamSelectionSelected?.idParticipacion,
    )
    expect(reused?.nombre).toBe(teamSelectionSelected?.nombre)
  })

  it('covers all seven required demonstration cases for event 1001', () => {
    const participants = findAttendanceParticipants(1001)

    expect(participants.some((p) => p.estadoParticipacion === 'seleccionado')).toBe(true)
    expect(
      participants.some(
        (p) =>
          p.estadoParticipacion === 'confirmo_asistencia' && !p.ultimaConfirmacionLlegada,
      ),
    ).toBe(true)
    expect(
      participants.some(
        (p) =>
          p.estadoParticipacion === 'confirmo_llegada' &&
          p.ultimaConfirmacionLlegada?.resultado === 'exitoso',
      ),
    ).toBe(true)

    const motivos = participants
      .map((p) => p.ultimaConfirmacionLlegada?.motivoFallo)
      .filter((motivo): motivo is NonNullable<typeof motivo> => Boolean(motivo))

    expect(motivos).toContain('fuera_geocerca')
    expect(motivos).toContain('biometria_fallida')
    expect(motivos).toContain('dispositivo_no_vinculado')
    expect(motivos).toContain('dispositivo_de_otro_usuario')
    expect(motivos).toContain('precision_insuficiente')
  })

  it('never includes a fake participation state — every estadoParticipacion is a real documented value', () => {
    const validStates = new Set([
      'seleccionado',
      'confirmo_asistencia',
      'confirmo_llegada',
    ])

    for (const participant of findAttendanceParticipants(1001)) {
      expect(validStates.has(participant.estadoParticipacion)).toBe(true)
    }
  })

  it('returns an empty list for event 2001 — Team Selection has zero selected participants there', () => {
    expect(findAttendanceParticipants(2001)).toEqual([])
  })

  it('returns an empty list for an event with no fixture data at all', () => {
    expect(findAttendanceParticipants(999999)).toEqual([])
  })

  it('never derives an id_usuario or exposes a UUID for any participant', () => {
    const uuidPattern =
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

    for (const participant of findAttendanceParticipants(1001)) {
      expect(Number.isInteger(participant.idParticipacion)).toBe(true)
      expect(String(participant.idParticipacion)).not.toMatch(uuidPattern)
    }
  })
})
