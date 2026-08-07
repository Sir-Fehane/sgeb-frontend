import { describe, expect, it } from 'vitest'

import { findTeamSelectionParticipants } from '@/features/events/team-selection/fixtures/teamSelectionFixtures'

describe('findTeamSelectionParticipants', () => {
  it('returns a mix of aparto and seleccionado participants for event 1001', () => {
    const participants = findTeamSelectionParticipants(1001)

    expect(participants.some((p) => p.estado === 'aparto')).toBe(true)
    expect(participants.some((p) => p.estado === 'seleccionado')).toBe(true)
  })

  it('returns only aparto participants for event 2001 — demonstrates an empty selected list', () => {
    const participants = findTeamSelectionParticipants(2001)

    expect(participants.length).toBeGreaterThan(0)
    expect(participants.every((p) => p.estado === 'aparto')).toBe(true)
  })

  it('returns an empty list for an event with no fixture data', () => {
    expect(findTeamSelectionParticipants(999999)).toEqual([])
  })

  it('every participant has a positive integer idParticipacion, never a UUID', () => {
    const uuidPattern =
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

    for (const participant of findTeamSelectionParticipants(1001)) {
      expect(Number.isInteger(participant.idParticipacion)).toBe(true)
      expect(participant.idParticipacion).toBeGreaterThan(0)
      expect(String(participant.idParticipacion)).not.toMatch(uuidPattern)
    }
  })
})
