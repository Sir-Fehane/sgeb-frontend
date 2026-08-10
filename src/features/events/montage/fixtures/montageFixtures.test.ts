import { describe, expect, it } from 'vitest'

import { findAttendanceParticipants } from '@/features/events/attendance/fixtures/attendanceFixtures'
import {
  findMontageParticipants,
  findMontageTables,
} from '@/features/events/montage/fixtures/montageFixtures'

describe('findMontageParticipants', () => {
  it('reuses real participants from Attendance for event 1001, by id/nombre/puesto', () => {
    const attendanceParticipants = findAttendanceParticipants(1001)
    const montageParticipants = findMontageParticipants(1001)

    for (const id of [5003, 6001, 6002]) {
      const attendance = attendanceParticipants.find((p) => p.idParticipacion === id)
      const montage = montageParticipants.find((p) => p.idParticipacion === id)
      expect(attendance).toBeDefined()
      expect(montage).toBeDefined()
      expect(montage?.nombre).toBe(attendance?.nombre)
      expect(montage?.puesto).toBe(attendance?.puesto)
    }
  })

  it('covers all seven required demonstration cases for event 1001', () => {
    const participants = findMontageParticipants(1001)
    const tables = findMontageTables(1001)

    // 1. montage checklist incomplete
    expect(participants.some((p) => p.checklist?.status === 'pending')).toBe(true)
    // 2. montage checklist completed but not approved
    expect(participants.some((p) => p.checklist?.status === 'completed')).toBe(true)
    // 3. montage checklist approved
    expect(participants.some((p) => p.checklist?.status === 'approved')).toBe(true)
    // 4. free tables
    expect(tables.some((mesa) => mesa.estado === 'libre')).toBe(true)
    // 5. occupied/already-assigned table
    expect(tables.some((mesa) => mesa.estado === 'ocupada')).toBe(true)
    // 6. participant with no assigned table
    expect(participants.some((p) => p.assignedTables.length === 0)).toBe(true)
    // 7. participant with an assigned table
    expect(participants.some((p) => p.assignedTables.length > 0)).toBe(true)
  })

  it('includes a participant with no checklist instance at all', () => {
    const participants = findMontageParticipants(1001)

    expect(participants.some((p) => p.checklist === undefined)).toBe(true)
  })

  it('includes both puesto values among approved/assignable participants — no invented puesto filter', () => {
    const participants = findMontageParticipants(1001)
    const approved = participants.filter((p) => p.checklist?.status === 'approved')

    expect(approved.some((p) => p.puesto === 'mesero')).toBe(true)
    expect(approved.some((p) => p.puesto === 'barra')).toBe(true)
  })

  it('returns an empty list for event 2001 — Attendance has zero selected participants there', () => {
    expect(findMontageParticipants(2001)).toEqual([])
  })

  it('returns an empty list for an event with no fixture data at all', () => {
    expect(findMontageParticipants(999999)).toEqual([])
  })

  it('never exposes codigo_qr or token_comensal on any table', () => {
    const tables = findMontageTables(1001)

    for (const mesa of tables) {
      expect(mesa).not.toHaveProperty('codigoQr')
      expect(mesa).not.toHaveProperty('codigo_qr')
      expect(mesa).not.toHaveProperty('tokenComensal')
      expect(mesa).not.toHaveProperty('token_comensal')
    }
  })

  it('uses only the two documented mesa states — libre or ocupada', () => {
    const tables = findMontageTables(1001)

    for (const mesa of tables) {
      expect(['libre', 'ocupada']).toContain(mesa.estado)
    }
  })
})

describe('findMontageTables', () => {
  it('returns an empty list for an event with no table fixture data', () => {
    expect(findMontageTables(2001)).toEqual([])
    expect(findMontageTables(999999)).toEqual([])
  })
})
